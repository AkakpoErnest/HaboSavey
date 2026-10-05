import { and, eq, inArray, or } from "drizzle-orm";
import { UpdateChallengeInput, type ChallengeDetailResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { loadChallengeRow, presentChallenges } from "@/lib/api/challenges";
import { presentProposalCard, stableShuffle } from "@/lib/api/present";
import { getCurrentUser, isStaff, requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

export const GET = route<Params<"id">>(async (_req, { params }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const staff = isStaff(user);
  const row = await loadChallengeRow(id);
  const [challenge] = await presentChallenges([row]);
  if (challenge.status === "draft" && !staff) throw new HttpError("not_found", "Challenge not found");

  const db = getDb();
  const visible = user
    ? or(eq(schema.proposals.status, "approved"), eq(schema.proposals.authorId, user.id))
    : eq(schema.proposals.status, "approved");
  const [proposals, myVote] = await Promise.all([
    db.select().from(schema.proposals).where(and(eq(schema.proposals.challengeId, id), visible)),
    user
      ? db.select().from(schema.votes).where(and(eq(schema.votes.challengeId, id), eq(schema.votes.userId, user.id)))
      : [],
  ]);
  const myVoteProposalId = myVote[0]?.proposalId ?? null;

  const resultsVisible =
    staff ||
    challenge.status === "closed" ||
    row.resultsVisibility === "always" ||
    (row.resultsVisibility === "after_vote" && myVoteProposalId !== null);

  const authorIds = [...new Set(proposals.map((p) => p.authorId))];
  const [authors, original, generated] = await Promise.all([
    authorIds.length
      ? db.select({ id: schema.users.id, name: schema.users.displayName }).from(schema.users).where(inArray(schema.users.id, authorIds))
      : [],
    signUrls("originals", proposals.map((p) => p.originalImagePath)),
    signUrls("generated", proposals.map((p) => p.generatedImagePath)),
  ]);
  const nameById = new Map(authors.map((a) => [a.id, a.name]));
  const ordered =
    challenge.status === "closed"
      ? [...proposals].sort((a, b) => b.voteCount - a.voteCount)
      : stableShuffle(proposals, user?.id ?? "anon");

  const canVoteRole = !!user && (!row.verifiedOnlyVoting || user.verifiedLocal);
  return ok<ChallengeDetailResponse>({
    challenge,
    proposals: ordered.map((p) => presentProposalCard(p, nameById.get(p.authorId) ?? "", { original, generated }, resultsVisible)),
    myVoteProposalId,
    resultsVisible,
    canSubmit: !!user && challenge.status === "open",
    canVote: canVoteRole && (challenge.status === "open" || challenge.status === "voting"),
  });
});

export const PATCH = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const staff = await requireStaff();
  const input = await parseJson(req, UpdateChallengeInput);
  const current = await loadChallengeRow(id);

  if (input.winnerProposalId) {
    const [p] = await getDb()
      .select({ id: schema.proposals.id })
      .from(schema.proposals)
      .where(and(eq(schema.proposals.id, input.winnerProposalId), eq(schema.proposals.challengeId, id)));
    if (!p) throw new HttpError("bad_request", "Winner must be a proposal in this challenge");
  }
  const toDate = (v: string | undefined) => (v === undefined ? undefined : new Date(v));
  const next = {
    submitOpensAt: toDate(input.submitOpensAt) ?? current.submitOpensAt,
    votingOpensAt: toDate(input.votingOpensAt) ?? current.votingOpensAt,
    closesAt: toDate(input.closesAt) ?? current.closesAt,
  };
  if (!(next.submitOpensAt <= next.votingOpensAt && next.votingOpensAt < next.closesAt)) {
    throw new HttpError("bad_request", "Dates must be submitOpensAt ≤ votingOpensAt < closesAt");
  }

  const [row] = await getDb()
    .update(schema.challenges)
    .set({
      placeId: input.placeId,
      titleJa: input.titleJa,
      titleEn: input.titleEn,
      descriptionJa: input.descriptionJa,
      descriptionEn: input.descriptionEn,
      coverImagePath: input.coverImagePath,
      resultsVisibility: input.resultsVisibility,
      verifiedOnlyVoting: input.verifiedOnlyVoting,
      status: input.status,
      winnerProposalId: input.winnerProposalId,
      ...next,
    })
    .where(eq(schema.challenges.id, id))
    .returning();
  await getDb()
    .insert(schema.auditLog)
    .values({ actorId: staff.id, action: "challenge.update", targetType: "challenge", targetId: id, meta: input });
  const [challenge] = await presentChallenges([row]);
  return ok({ challenge });
});
