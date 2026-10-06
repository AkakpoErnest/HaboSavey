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

export async function earnedToday(userId: string): Promise<number> {
  const [row] = await getDb()
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
    const remaining = DAILY_CAP - (await earnedToday(user.id));
    const amount = Math.min(EARN_RULES[reason], remaining);
    if (amount <= 0) return 0;
    const inserted = await getDb()
      .insert(schema.pointsLedger)
      .values({ userId: user.id, amount, reason, refId })
      .onConflictDoNothing()
      .returning({ id: schema.pointsLedger.id });
    return inserted.length ? amount : 0;
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
