import { and, eq, gt, gte, sql } from "drizzle-orm";
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
export async function awardPoints(user: UserLike | null, reason: EarnReason, refId: string): Promise<number> {
  if (!user?.verifiedLocal) return 0;
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
