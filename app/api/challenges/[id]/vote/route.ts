import { and, eq } from "drizzle-orm";
import { CastVoteInput, type VoteResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { loadChallengeRow } from "@/lib/api/challenges";
import { effectiveChallengeStatus } from "@/lib/api/present";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

async function assertCanVote(challengeId: string, user: CurrentUser) {
  const challenge = await loadChallengeRow(challengeId);
  const status = effectiveChallengeStatus(challenge);
  if (status !== "open" && status !== "voting") throw new HttpError("conflict", "Voting is not open for this challenge");
  if (challenge.verifiedOnlyVoting && !user.verifiedLocal) {
    throw new HttpError("forbidden", "Only verified Kesennuma residents can vote in this challenge");
  }
}

/** Cast or move my vote. The vote_count trigger in supabase/rls.sql keeps counts in sync. */
export const PUT = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const { proposalId } = await parseJson(req, CastVoteInput);
  await assertCanVote(id, user);

  const db = getDb();
  const [proposal] = await db
    .select({ id: schema.proposals.id, authorId: schema.proposals.authorId })
    .from(schema.proposals)
    .where(and(eq(schema.proposals.id, proposalId), eq(schema.proposals.challengeId, id), eq(schema.proposals.status, "approved")));
  if (!proposal) throw new HttpError("not_found", "Proposal not found in this challenge");

  await db
    .insert(schema.votes)
    .values({ challengeId: id, proposalId, userId: user.id })
    .onConflictDoUpdate({
      target: [schema.votes.challengeId, schema.votes.userId],
      set: { proposalId, createdAt: new Date() },
    });
  return ok<VoteResponse>({ myVoteProposalId: proposalId });
});

export const DELETE = route<Params<"id">>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  await assertCanVote(id, user);
  await getDb().delete(schema.votes).where(and(eq(schema.votes.challengeId, id), eq(schema.votes.userId, user.id)));
  return ok<VoteResponse>({ myVoteProposalId: null });
});
