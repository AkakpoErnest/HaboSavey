import { and, eq } from "drizzle-orm";
import type { GenerationJobResponse } from "@/lib/schemas";
import { HttpError, ok, route, type Params } from "@/lib/api/http";
import { DAILY_LIMIT, generationsToday } from "@/lib/ai/run-job";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";
import { outputBucket } from "@/lib/ai/run-job";
import { IMAGINE_COST, refundPoints } from "@/lib/points";

/** Jobs run in a background function (limit 15 min); one still unfinished after that was killed: fail it and refund. */
const STALE_MS = 16 * 60_000;

export const GET = route<Params<"jobId">>(async (_req, { params }) => {
  const { jobId } = await params;
  const user = await requireUser();
  const [job] = await getDb()
    .select()
    .from(schema.generationJobs)
    .where(and(eq(schema.generationJobs.id, jobId), eq(schema.generationJobs.userId, user.id)));
  if (!job) throw new HttpError("not_found", "Job not found");

  if ((job.status === "queued" || job.status === "running") && Date.now() - job.createdAt.getTime() > STALE_MS) {
    const error = "Image generation took too long. Your points were returned. Please try again.";
    await getDb().update(schema.generationJobs).set({ status: "failed", error, finishedAt: new Date() }).where(eq(schema.generationJobs.id, job.id));
    // Only "Imagine" jobs (resident photos, built-in prompt) cost points; refunds are idempotent per job.
    if (job.sourceBucket === "originals" && !job.rawPrompt) await refundPoints(job.userId, IMAGINE_COST, job.id);
    Object.assign(job, { status: "failed", error });
  }

  const urls = await signUrls(outputBucket(job.sourceBucket), job.resultPaths);
  return ok<GenerationJobResponse>({
    id: job.id,
    status: job.status,
    results: job.resultPaths.flatMap((path) => (urls.has(path) ? [{ path, url: urls.get(path)! }] : [])),
    error: job.error,
    remainingToday: Math.max(0, DAILY_LIMIT - (await generationsToday(user.id))),
  });
});
