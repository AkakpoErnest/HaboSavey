import { z } from "zod";
import { Id, IsoDate } from "./common";
import { Place } from "./place";
import { ProposalCard } from "./proposal";

export const ChallengeStatus = z.enum(["draft", "open", "voting", "closed"]);
export type ChallengeStatus = z.infer<typeof ChallengeStatus>;

/** When vote counts are shown to residents. */
export const ResultsVisibility = z.enum(["always", "after_vote", "after_close"]);
export type ResultsVisibility = z.infer<typeof ResultsVisibility>;

export const Challenge = z.object({
  id: Id,
  place: Place.nullable(),
  titleJa: z.string(),
  titleEn: z.string().nullable(),
  descriptionJa: z.string(),
  descriptionEn: z.string().nullable(),
  coverImageUrl: z.string().url().nullable(),
  status: ChallengeStatus,
  submitOpensAt: IsoDate,
  votingOpensAt: IsoDate,
  closesAt: IsoDate,
  resultsVisibility: ResultsVisibility,
  verifiedOnlyVoting: z.boolean(),
  winnerProposalId: Id.nullable(),
  proposalCount: z.number().int(),
  createdAt: IsoDate,
});
export type Challenge = z.infer<typeof Challenge>;

/** GET /api/challenges?status= */
export const ListChallengesQuery = z.object({ status: ChallengeStatus.optional() });
export const ListChallengesResponse = z.object({ challenges: z.array(Challenge) });
export type ListChallengesResponse = z.infer<typeof ListChallengesResponse>;

/**
 * GET /api/challenges/:id
 * Proposals come in a per-user random order. `voteCount` on each card is null
 * whenever `resultsVisible` is false.
 */
export const ChallengeDetailResponse = z.object({
  challenge: Challenge,
  proposals: z.array(ProposalCard),
  myVoteProposalId: Id.nullable(),
  resultsVisible: z.boolean(),
  canSubmit: z.boolean(),
  canVote: z.boolean(),
});
export type ChallengeDetailResponse = z.infer<typeof ChallengeDetailResponse>;

/** POST /api/challenges (staff) */
export const CreateChallengeInput = z.object({
  placeId: Id.optional(),
  titleJa: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional(),
  descriptionJa: z.string().max(5000),
  descriptionEn: z.string().max(5000).optional(),
  coverImagePath: z.string().optional(),
  submitOpensAt: IsoDate,
  votingOpensAt: IsoDate,
  closesAt: IsoDate,
  resultsVisibility: ResultsVisibility.default("after_vote"),
  verifiedOnlyVoting: z.boolean().default(false),
});
export type CreateChallengeInput = z.infer<typeof CreateChallengeInput>;

/** PATCH /api/challenges/:id (staff) */
export const UpdateChallengeInput = CreateChallengeInput.partial().extend({
  status: ChallengeStatus.optional(),
  winnerProposalId: Id.nullable().optional(),
});
export type UpdateChallengeInput = z.infer<typeof UpdateChallengeInput>;
