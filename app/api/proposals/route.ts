import { and, eq } from "drizzle-orm";
import { CreateProposalInput } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { loadChallengeRow } from "@/lib/api/challenges";
import { effectiveChallengeStatus } from "@/lib/api/present";
import { loadProposal } from "@/lib/api/proposals";
import { moderateText } from "@/lib/ai/moderation";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ownsPath } from "@/lib/storage";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, CreateProposalInput);

  const challenge = await loadChallengeRow(input.challengeId);
  if (effectiveChallengeStatus(challenge) !== "open") throw new HttpError("conflict", "This challenge is not accepting proposals");
  if (!ownsPath(user.id, input.originalPath)) throw new HttpError("forbidden", "Not your photo");

  // The generated image must come from one of this user's finished jobs for the same original photo.
  const db = getDb();
  const jobs = await db
    .select({ resultPaths: schema.generationJobs.resultPaths })
    .from(schema.generationJobs)
    .where(
      and(
        eq(schema.generationJobs.userId, user.id),
        eq(schema.generationJobs.originalImagePath, input.originalPath),
        eq(schema.generationJobs.status, "done"),
      ),
    );
  if (!jobs.some((j) => j.resultPaths.includes(input.generatedPath))) {
    throw new HttpError("forbidden", "Generated image not found for this photo");
  }

  const flags = await moderateText(`${input.title}\n${input.description}`);
  if (flags.blocked) throw new HttpError("moderation_rejected", "Please rephrase your title or description");

  const [row] = await db
    .insert(schema.proposals)
    .values({
      challengeId: input.challengeId,
      authorId: user.id,
      title: input.title,
      description: input.description,
      prompt: input.prompt,
      originalImagePath: input.originalPath,
      generatedImagePath: input.generatedPath,
      lat: input.location?.lat,
      lng: input.location?.lng,
      aiFlags: flags.labels,
      // Everything starts in the moderation queue.
      status: "pending",
    })
    .returning();
  return ok({ proposal: await loadProposal(row.id, user) }, { status: 201 });
});
