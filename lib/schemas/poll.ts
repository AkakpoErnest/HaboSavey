import { z } from "zod";
import { Id, IsoDate } from "./common";
import { ResultsVisibility } from "./challenge";

export const PollStatus = z.enum(["draft", "open", "closed"]);
export type PollStatus = z.infer<typeof PollStatus>;
export const PollChoice = z.enum(["a", "b"]);
export type PollChoice = z.infer<typeof PollChoice>;

export const PollOption = z.object({
  key: PollChoice,
  imageUrl: z.string().url(),
  labelJa: z.string(),
  labelEn: z.string().nullable(),
});
export type PollOption = z.infer<typeof PollOption>;

export const Poll = z.object({
  id: Id,
  /** Memorable URL id: /[locale]/poll/<slug> */
  slug: z.string(),
  /** Shown at /[locale]/poll */
  featured: z.boolean(),
  titleJa: z.string(),
  titleEn: z.string().nullable(),
  questionJa: z.string(),
  questionEn: z.string().nullable(),
  descriptionJa: z.string(),
  descriptionEn: z.string().nullable(),
  options: z.tuple([PollOption, PollOption]),
  status: PollStatus,
  opensAt: IsoDate.nullable(),
  closesAt: IsoDate.nullable(),
  resultsVisibility: ResultsVisibility,
  requireSignIn: z.boolean(),
  verifiedOnly: z.boolean(),
  createdAt: IsoDate,
});
export type Poll = z.infer<typeof Poll>;

export const PollTally = z.object({ a: z.number().int(), b: z.number().int(), total: z.number().int() });
export type PollTally = z.infer<typeof PollTally>;

/** GET /api/polls */
export const ListPollsResponse = z.object({
  polls: z.array(Poll.extend({ myChoice: PollChoice.nullable() })),
});
export type ListPollsResponse = z.infer<typeof ListPollsResponse>;

/** GET /api/polls/:id. `results` is null unless visible (staff, after voting, or after close per resultsVisibility). */
export const PollDetailResponse = z.object({
  poll: Poll,
  myChoice: PollChoice.nullable(),
  canVote: z.boolean(),
  /** Why voting isn't possible: sign_in | verify | not_open | closed */
  blockedReason: z.enum(["sign_in", "verify", "not_open", "closed"]).nullable(),
  results: PollTally.nullable(),
  /** Points this viewer would get for voting now (0 = none, e.g. already voted or not eligible). */
  votePoints: z.number().int(),
  /** True when those points would be held on this device until the person signs in (guest earning). */
  votePointsGuest: z.boolean(),
});
export type PollDetailResponse = z.infer<typeof PollDetailResponse>;

/** PUT /api/polls/:id/vote. Anonymous by default; `via` is the QR code the voter scanned. Can be changed while open. */
export const PollVoteInput = z.object({
  choice: PollChoice,
  via: z.string().regex(/^[a-z0-9]{4,32}$/i).optional(),
});
export type PollVoteInput = z.infer<typeof PollVoteInput>;

export const PollVoteResponse = z.object({
  myChoice: PollChoice,
  results: PollTally.nullable(),
  /** Participation points just awarded (verified residents, first vote on this poll). */
  pointsAwarded: z.number().int(),
  /** Legacy (device-held guest points); always false now that anonymous voters get a guest account. */
  pointsPending: z.boolean(),
  /** Set when the voter is using a guest account (no email): its nickname, and whether it was just created. */
  guest: z.object({ nickname: z.string(), created: z.boolean() }).nullable(),
});
export type PollVoteResponse = z.infer<typeof PollVoteResponse>;

/** POST /api/polls (staff). Image paths come from POST /api/uploads with bucket "poll-images". */
export const CreatePollInput = z.object({
  /** Optional memorable URL id; generated from the English (or Japanese) title if omitted. */
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "3–40 lowercase letters, digits or hyphens").optional(),
  /** Make this the poll at /[locale]/poll (unfeatures the others). */
  featured: z.boolean().default(false),
  titleJa: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional(),
  questionJa: z.string().min(1).max(300),
  questionEn: z.string().max(300).optional(),
  descriptionJa: z.string().max(5000).default(""),
  descriptionEn: z.string().max(5000).optional(),
  optionA: z.object({ imagePath: z.string().min(1), labelJa: z.string().min(1).max(80), labelEn: z.string().max(80).optional() }),
  optionB: z.object({ imagePath: z.string().min(1), labelJa: z.string().min(1).max(80), labelEn: z.string().max(80).optional() }),
  placeId: Id.optional(),
  status: PollStatus.default("draft"),
  opensAt: IsoDate.optional(),
  closesAt: IsoDate.optional(),
  resultsVisibility: ResultsVisibility.default("after_vote"),
  requireSignIn: z.boolean().default(false),
  verifiedOnly: z.boolean().default(false),
  /** Also create a QR code pointing at this poll. */
  createQr: z.boolean().default(true),
});
export type CreatePollInput = z.infer<typeof CreatePollInput>;

/** PATCH /api/polls/:id (staff) */
export const UpdatePollInput = z.object({
  status: PollStatus.optional(),
  featured: z.boolean().optional(),
  titleJa: z.string().min(1).max(200).optional(),
  titleEn: z.string().max(200).nullable().optional(),
  questionJa: z.string().min(1).max(300).optional(),
  questionEn: z.string().max(300).nullable().optional(),
  descriptionJa: z.string().max(5000).optional(),
  descriptionEn: z.string().max(5000).nullable().optional(),
  opensAt: IsoDate.nullable().optional(),
  closesAt: IsoDate.nullable().optional(),
  resultsVisibility: ResultsVisibility.optional(),
});
export type UpdatePollInput = z.infer<typeof UpdatePollInput>;

/** GET /api/polls/:id/results (staff). ?format=csv for a per-vote CSV. */
export const PollResultsResponse = z.object({
  poll: Poll,
  tally: PollTally,
  /** Breakdown by distribution channel (QR code label, or "Web link"). */
  bySource: z.array(z.object({ qrCodeId: Id.nullable(), label: z.string(), a: z.number().int(), b: z.number().int() })),
  /** Votes per day (JST, YYYY-MM-DD). */
  byDay: z.array(z.object({ day: z.string(), a: z.number().int(), b: z.number().int() })),
  signedInShare: z.number(),
});
export type PollResultsResponse = z.infer<typeof PollResultsResponse>;
