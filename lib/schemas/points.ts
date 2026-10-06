import { z } from "zod";
import { IsoDate } from "./common";

export const PointsReason = z.enum([
  "poll_vote",
  "survey_response",
  "proposal_approved",
  "qr_checkin",
  "game_deposit",
  "game_reward",
  "admin_adjust",
]);
export type PointsReason = z.infer<typeof PointsReason>;

/**
 * GET /api/points (signed in). Points reward participation only, never a particular choice.
 * Only verified residents earn (`eligible`); there's a daily cap (JST).
 */
export const PointsResponse = z.object({
  balance: z.number().int(),
  eligible: z.boolean(),
  todayEarned: z.number().int(),
  dailyCap: z.number().int(),
  /** Points per action, for "how to earn" UI. */
  rules: z.object({
    poll_vote: z.number().int(),
    survey_response: z.number().int(),
    proposal_approved: z.number().int(),
    qr_checkin: z.number().int(),
  }),
  history: z.array(
    z.object({ amount: z.number().int(), reason: PointsReason, refId: z.string(), createdAt: IsoDate, onchain: z.boolean() }),
  ),
});
export type PointsResponse = z.infer<typeof PointsResponse>;

/**
 * Added to action responses (poll vote, survey submit, QR resolve): points just awarded, 0 if none
 * (not signed in, not verified, already awarded, or daily cap reached). Show a "+N pt" toast when > 0.
 */
export const PointsAwarded = z.number().int().nonnegative();
