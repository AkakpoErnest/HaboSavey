import type { PlayStartResponse } from "@/lib/schemas";
import { HttpError, ok, route } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth";
import { createAnonUser } from "@/lib/auth/anon";
import { getDb, schema } from "@/lib/db";
import { PLAY, playEarnedToday, roundsStartedToday } from "@/lib/play";

/** Starts a round of the jumping game. Players without an account get a guest account (nickname) so points have a home. */
export const POST = route(async () => {
  const user = (await getCurrentUser()) ?? (await createAnonUser());
  if ((await roundsStartedToday(user.id)) >= PLAY.maxStartsPerDay) throw new HttpError("rate_limited", "That's a lot of rounds today. Please play again tomorrow!");
  const [round] = await getDb().insert(schema.gameRounds).values({ userId: user.id }).returning();
  return ok<PlayStartResponse>({
    roundId: round.id,
    startedAt: round.startedAt.toISOString(),
    pointsPerRound: PLAY.pointsPerRound,
    dailyCap: PLAY.dailyCap,
    earnedToday: await playEarnedToday(user.id),
    minSeconds: PLAY.minSeconds,
    minBonitos: PLAY.minBonitos,
    nickname: user.displayName ?? null,
  }, { status: 201 });
});
