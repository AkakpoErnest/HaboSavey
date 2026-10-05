import { and, eq } from "drizzle-orm";
import type { Proposal } from "@/lib/schemas";
import { HttpError } from "@/lib/api/http";
import { effectiveChallengeStatus, presentProposalCard } from "@/lib/api/present";
import { isStaff, type CurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

/** One proposal as the given viewer may see it (404 if not visible to them). */
export async function loadProposal(id: string, viewer: CurrentUser | null): Promise<Proposal> {
  const db = getDb();
  const [row] = await db
    .select({ p: schema.proposals, author: schema.users.displayName, challenge: schema.challenges })
    .from(schema.proposals)
    .innerJoin(schema.users, eq(schema.users.id, schema.proposals.authorId))
    .innerJoin(schema.challenges, eq(schema.challenges.id, schema.proposals.challengeId))
    .where(eq(schema.proposals.id, id));
  if (!row) throw new HttpError("not_found", "Proposal not found");
  const { p, challenge } = row;
  const isMine = viewer?.id === p.authorId;
  if (p.status !== "approved" && !isMine && !isStaff(viewer)) throw new HttpError("not_found", "Proposal not found");

  let showVotes = isMine || isStaff(viewer) || challenge.resultsVisibility === "always" || effectiveChallengeStatus(challenge) === "closed";
  if (!showVotes && viewer && challenge.resultsVisibility === "after_vote") {
    const [v] = await db.select({ id: schema.votes.id }).from(schema.votes).where(and(eq(schema.votes.userId, viewer.id), eq(schema.votes.challengeId, p.challengeId)));
    showVotes = !!v;
  }
  const [original, generated] = await Promise.all([
    signUrls("originals", [p.originalImagePath]),
    signUrls("generated", [p.generatedImagePath]),
  ]);
  return {
    ...presentProposalCard(p, row.author, { original, generated }, showVotes),
    description: p.description,
    prompt: p.prompt,
    lat: p.lat,
    lng: p.lng,
    isMine,
  };
}
