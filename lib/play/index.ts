import { and, eq, gte, isNull, like, sql } from "drizzle-orm";
import { startOfJstDay } from "@/lib/ai/run-job";
import { getDb, schema } from "@/lib/db";
import { canEarn, withUserLock, type Exec } from "@/lib/points";

/** Jumping game rewards. Points are "game_reward" ledger rows with refId "jump:<roundId>" (one per round, ever). */
export const PLAY = {
  pointsPerRound: Number(process.env.PLAY_POINTS_PER_ROUND ?? 2),
  dailyCap: Number(process.env.PLAY_DAILY_CAP ?? 10),
  minSeconds: 20,
  minBonitos: 3,
  /** Rounds older than this can't be finished (stops banking a round now and finishing it days later). */
  maxSeconds: 15 * 60,
  /** Upper bounds on what a real player can do per second of play; anything above is rejected as implausible. */
  maxBonitosPerSecond: 3,
  maxDistancePerSecond: 1000,
  maxStartsPerDay: 200,
} as const;

const REF = "jump:";

export async function playEarnedToday(userId: string, exec: Exec = getDb()): Promise<number> {
  const [row] = await exec
    .select({ n: sql<number>`coalesce(sum(${schema.pointsLedger.amount}), 0)::int` })
    .from(schema.pointsLedger)
    .where(and(
      eq(schema.pointsLedger.userId, userId),
      eq(schema.pointsLedger.reason, "game_reward"),
      like(schema.pointsLedger.refId, `${REF}%`),
      gte(schema.pointsLedger.createdAt, startOfJstDay()),
    ));
  return row?.n ?? 0;
}

export async function roundsStartedToday(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.gameRounds)
    .where(and(eq(schema.gameRounds.userId, userId), gte(schema.gameRounds.startedAt, startOfJstDay())));
  return row?.n ?? 0;
}

type Reason = "too_short" | "too_few_bonitos" | "implausible" | "daily_cap" | "not_eligible";

/** Pure check of a finished round against the rules (server-measured duration, client-reported counts). */
export function judgeRound(seconds: number, bonitos: number, distance: number): Reason | null {
  if (bonitos > Math.ceil(seconds * PLAY.maxBonitosPerSecond) || distance > Math.ceil(seconds * PLAY.maxDistancePerSecond)) return "implausible";
  if (seconds < PLAY.minSeconds) return "too_short";
  if (bonitos < PLAY.minBonitos) return "too_few_bonitos";
  return null;
}

/**
 * Finishes a round exactly once and awards points if it qualifies. Returns null when the round doesn't exist, isn't
 * this user's, was already finished, or is too old. All under the per-user lock, so parallel finishes can't pass the cap.
 */
export async function finishRound(user: { id: string; verifiedLocal: boolean }, roundId: string, bonitos: number, distance: number) {
  return withUserLock(user.id, async (tx) => {
    const now = new Date();
    const [round] = await tx
      .update(schema.gameRounds)
      .set({ finishedAt: now, bonitos, distance })
      .where(and(
        eq(schema.gameRounds.id, roundId),
        eq(schema.gameRounds.userId, user.id),
        isNull(schema.gameRounds.finishedAt),
        gte(schema.gameRounds.startedAt, new Date(now.getTime() - PLAY.maxSeconds * 1000)),
      ))
      .returning();
    if (!round) return null;

    const seconds = (now.getTime() - round.startedAt.getTime()) / 1000;
    let reason: Reason | null = judgeRound(seconds, bonitos, distance);
    const earned = await playEarnedToday(user.id, tx);
    let points = 0;
    if (!reason && !canEarn(user)) reason = "not_eligible";
    if (!reason) {
      points = Math.min(PLAY.pointsPerRound, PLAY.dailyCap - earned);
      if (points <= 0) { points = 0; reason = "daily_cap"; }
    }
    if (points > 0) {
      await tx.insert(schema.pointsLedger).values({ userId: user.id, amount: points, reason: "game_reward", refId: REF + round.id }).onConflictDoNothing();
    }
    const qualified = reason === null || reason === "daily_cap";
    await tx.update(schema.gameRounds).set({ qualified, pointsAwarded: points }).where(eq(schema.gameRounds.id, round.id));
    return { qualified, reason, pointsAwarded: points, earnedToday: earned + points };
  });
}
