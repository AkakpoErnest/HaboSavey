import { and, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";
import type { PointsReason } from "@/lib/schemas";
import { startOfJstDay } from "@/lib/ai/run-job";
import { getDb, schema } from "@/lib/db";

/** Points per participation action. Never depends on which option someone chose. */
export const EARN_RULES = {
  poll_vote: 10,
  survey_response: 20,
  proposal_approved: 50,
  qr_checkin: 5,
} as const satisfies Partial<Record<PointsReason, number>>;
export type EarnReason = keyof typeof EARN_RULES;

export const DAILY_CAP = Number(process.env.POINTS_DAILY_CAP ?? 100);

type UserLike = { id: string; verifiedLocal: boolean };
type Db = ReturnType<typeof getDb>;
/** The db or a transaction: lets cap reads happen inside the same locked transaction as the insert. */
export type Exec = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Runs fn in a transaction holding a per-user advisory lock, so concurrent awards for the same person
 * are serialized and daily caps can't be exceeded by parallel requests.
 */
export async function withUserLock<T>(userId: string, fn: (tx: Exec) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"points:" + userId}, 0))`);
    return fn(tx);
  });
}

export async function earnedToday(userId: string, exec: Exec = getDb()): Promise<number> {
  const [row] = await exec
    .select({ n: sql<number>`coalesce(sum(${schema.pointsLedger.amount}), 0)::int` })
    .from(schema.pointsLedger)
    .where(
      and(
        eq(schema.pointsLedger.userId, userId),
        gt(schema.pointsLedger.amount, 0),
        sql`${schema.pointsLedger.reason} in ('poll_vote','survey_response','proposal_approved','qr_checkin')`,
        gte(schema.pointsLedger.createdAt, startOfJstDay()),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Awards participation points. Returns the amount actually awarded (0 when the user isn't a verified
 * resident, already got points for this refId, or hit the daily cap). Never throws on those cases,
 * so callers can award after the main action without affecting it.
 */
/**
 * POINTS_OPEN_EARNING=1 lets anyone earn (signed in or not), e.g. for a live demo. Default: verified residents only,
 * because open earning is easy to farm with extra devices.
 */
export const openEarning = () => process.env.POINTS_OPEN_EARNING === "1";
export const canEarn = (user: UserLike | null) => !!user && (user.verifiedLocal || openEarning());

export async function awardPoints(user: UserLike | null, reason: EarnReason, refId: string): Promise<number> {
  if (!user || !canEarn(user)) return 0;
  try {
    return await withUserLock(user.id, async (tx) => {
      const amount = Math.min(EARN_RULES[reason], DAILY_CAP - (await earnedToday(user.id, tx)));
      if (amount <= 0) return 0;
      const inserted = await tx
        .insert(schema.pointsLedger)
        .values({ userId: user.id, amount, reason, refId })
        .onConflictDoNothing()
        .returning({ id: schema.pointsLedger.id });
      return inserted.length ? amount : 0;
    });
  } catch (err) {
    console.error("[points] award failed", reason, refId, err);
    return 0;
  }
}

export async function pointsBalance(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`coalesce(sum(${schema.pointsLedger.amount}), 0)::int` })
    .from(schema.pointsLedger)
    .where(eq(schema.pointsLedger.userId, userId));
  return row?.n ?? 0;
}

/** "YYYY-MM-DD" in Japan time, for once-per-day refIds. */
export const jstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** Guest points for a device (open earning only). Returns the amount awarded (0 if already awarded or disabled). */
export async function awardGuestPoints(voterKey: string | null, reason: EarnReason, refId: string): Promise<number> {
  if (!openEarning() || !voterKey) return 0;
  try {
    const inserted = await getDb()
      .insert(schema.guestPoints)
      .values({ voterKey, amount: EARN_RULES[reason], reason, refId })
      .onConflictDoNothing()
      .returning({ id: schema.guestPoints.id });
    return inserted.length ? EARN_RULES[reason] : 0;
  } catch (err) {
    console.error("[points] guest award failed", reason, refId, err);
    return 0;
  }
}

/**
 * Moves this device's unclaimed guest points into the signed-in user's ledger (skipping anything the user already
 * earned for the same action). Returns the amount claimed.
 */
export async function claimGuestPoints(userId: string, voterKeys: string[]): Promise<number> {
  const keys = voterKeys.filter((k) => k.startsWith("dev:"));
  if (keys.length === 0) return 0;
  return withUserLock(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.guestPoints)
      .where(and(inArray(schema.guestPoints.voterKey, keys), isNull(schema.guestPoints.claimedBy)));
    let claimed = 0;
    for (const r of rows) {
      const ins = await tx
        .insert(schema.pointsLedger)
        .values({ userId, amount: r.amount, reason: r.reason, refId: r.refId })
        .onConflictDoNothing()
        .returning({ id: schema.pointsLedger.id });
      if (ins.length) claimed += r.amount;
      await tx.update(schema.guestPoints).set({ claimedBy: userId, claimedAt: new Date() }).where(eq(schema.guestPoints.id, r.id));
    }
    return claimed;
  });
}

/** Points moved in from guest accounts in the last `minutes` (for the "points collected" notice). */
export async function recentlyMerged(userId: string, minutes = 10): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`coalesce(sum((${schema.auditLog.meta}->>'points')::int), 0)::int` })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.actorId, userId), eq(schema.auditLog.action, "guest.merge"), gte(schema.auditLog.createdAt, new Date(Date.now() - minutes * 60_000))));
  return row?.n ?? 0;
}

/** Guest points this user claimed from this device in the last `minutes` (for a "points collected" notice). */
export async function recentlyClaimed(userId: string, voterKeys: string[], minutes = 10): Promise<number> {
  const keys = voterKeys.filter((k) => k.startsWith("dev:"));
  if (keys.length === 0) return 0;
  const [row] = await getDb()
    .select({ n: sql<number>`coalesce(sum(${schema.guestPoints.amount}), 0)::int` })
    .from(schema.guestPoints)
    .where(and(
      inArray(schema.guestPoints.voterKey, keys),
      eq(schema.guestPoints.claimedBy, userId),
      gte(schema.guestPoints.claimedAt, new Date(Date.now() - minutes * 60_000)),
    ));
  return row?.n ?? 0;
}

/**
 * Moves a guest account's points, game stamps and game links into an email account (when the person signs in by
 * email on a device that had a guest account). Duplicate awards are skipped. Returns the points moved.
 */
export async function mergeGuestAccount(guestId: string, intoUserId: string): Promise<number> {
  if (guestId === intoUserId) return 0;
  return withUserLock(intoUserId, async (tx) => {
    const rows = await tx.select().from(schema.pointsLedger).where(eq(schema.pointsLedger.userId, guestId));
    let moved = 0;
    for (const r of rows) {
      const ins = await tx
        .insert(schema.pointsLedger)
        .values({ userId: intoUserId, amount: r.amount, reason: r.reason, refId: r.refId, onchainTx: r.onchainTx })
        .onConflictDoNothing()
        .returning({ id: schema.pointsLedger.id });
      if (ins.length) moved += r.amount;
    }
    await tx.delete(schema.pointsLedger).where(eq(schema.pointsLedger.userId, guestId));
    const stamps = await tx.select().from(schema.gameStamps).where(eq(schema.gameStamps.userId, guestId));
    for (const st of stamps) {
      await tx.insert(schema.gameStamps).values({ userId: intoUserId, app: st.app, kind: st.kind, key: st.key }).onConflictDoNothing();
    }
    await tx.delete(schema.gameStamps).where(eq(schema.gameStamps.userId, guestId));
    await tx.update(schema.gameLinks).set({ userId: intoUserId }).where(eq(schema.gameLinks.userId, guestId));
    await tx.insert(schema.auditLog).values({ actorId: intoUserId, action: "guest.merge", targetType: "user", targetId: guestId, meta: { points: moved } });
    return moved;
  });
}
