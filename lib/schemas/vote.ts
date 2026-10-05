import { z } from "zod";
import { Id } from "./common";

/** PUT /api/challenges/:id/vote: casts the vote, or moves it to another proposal. */
export const CastVoteInput = z.object({ proposalId: Id });
export type CastVoteInput = z.infer<typeof CastVoteInput>;

/** Response for both PUT and DELETE. */
export const VoteResponse = z.object({ myVoteProposalId: Id.nullable() });
export type VoteResponse = z.infer<typeof VoteResponse>;
