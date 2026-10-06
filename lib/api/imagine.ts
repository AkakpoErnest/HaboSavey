import { and, eq } from "drizzle-orm";
import { HttpError } from "@/lib/api/http";
import type { CurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

/** Loads a finished generation job owned by the user and checks the chosen image is one of its results. */
export async function loadOwnedResult(user: CurrentUser, jobId: string, path: string) {
  const [job] = await getDb()
    .select()
    .from(schema.generationJobs)
    .where(and(eq(schema.generationJobs.id, jobId), eq(schema.generationJobs.userId, user.id)));
  if (!job || job.status !== "done") throw new HttpError("not_found", "Generation not found");
  if (!job.resultPaths.includes(path)) throw new HttpError("bad_request", "Pick one of the generated images");
  return job;
}
