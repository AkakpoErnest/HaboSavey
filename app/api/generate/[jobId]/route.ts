import { and, eq } from "drizzle-orm";
import type { GenerationJobResponse } from "@/lib/schemas";
import { HttpError, ok, route, type Params } from "@/lib/api/http";
import { DAILY_LIMIT, generationsToday } from "@/lib/ai/run-job";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

export const GET = route<Params<"jobId">>(async (_req, { params }) => {
  const { jobId } = await params;
  const user = await requireUser();
  const [job] = await getDb()
    .select()
    .from(schema.generationJobs)
    .where(and(eq(schema.generationJobs.id, jobId), eq(schema.generationJobs.userId, user.id)));
  if (!job) throw new HttpError("not_found", "Job not found");

  const urls = await signUrls("generated", job.resultPaths);
  return ok<GenerationJobResponse>({
    id: job.id,
    status: job.status,
    results: job.resultPaths.flatMap((path) => (urls.has(path) ? [{ path, url: urls.get(path)! }] : [])),
    error: job.error,
    remainingToday: Math.max(0, DAILY_LIMIT - (await generationsToday(user.id))),
  });
});
