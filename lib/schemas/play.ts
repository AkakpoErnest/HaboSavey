import { z } from "zod";
import { Id } from "./common";

/** Built-in jumping game (/play). Start a round, play, then finish it once with what was collected. */
export const PlayStartResponse = z.object({
  roundId: Id,
  startedAt: z.string(),
  pointsPerRound: z.number().int(),
  dailyCap: z.number().int(),
  earnedToday: z.number().int(),
  /** Rules the client can show: play at least this long and collect at least this many bonito. */
  minSeconds: z.number().int(),
  minBonitos: z.number().int(),
  nickname: z.string().nullable(),
});
export type PlayStartResponse = z.infer<typeof PlayStartResponse>;

export const PlayFinishInput = z.object({
  bonitos: z.number().int().min(0).max(1000),
  distance: z.number().int().min(0).max(1_000_000),
});
export type PlayFinishInput = z.infer<typeof PlayFinishInput>;

export const PlayFinishResponse = z.object({
  qualified: z.boolean(),
  /** Why the round earned nothing: too_short, too_few_bonitos, implausible, daily_cap, not_eligible. Null when rewarded. */
  reason: z.enum(["too_short", "too_few_bonitos", "implausible", "daily_cap", "not_eligible"]).nullable(),
  pointsAwarded: z.number().int(),
  earnedToday: z.number().int(),
  dailyCap: z.number().int(),
  balance: z.number().int(),
});
export type PlayFinishResponse = z.infer<typeof PlayFinishResponse>;
