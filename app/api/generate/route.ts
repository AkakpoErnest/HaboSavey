import { after } from "next/server";
import { GenerateInput, type GenerateResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { DAILY_LIMIT, generationsToday, runGenerationJob } from "@/lib/ai/run-job";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ownsPath } from "@/lib/storage";

// Generation runs after the response is sent; allow time for 3–4 image edits.
export const maxDuration = 120;

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, GenerateInput);
  if (!ownsPath(user.id, input.originalPath)) throw new HttpError("forbidden", "Not your photo");
  if ((await generationsToday(user.id)) >= DAILY_LIMIT) {
    throw new HttpError("rate_limited", `You can create up to ${DAILY_LIMIT} images per day. Please try again tomorrow.`);
  }

  const [job] = await getDb()
    .insert(schema.generationJobs)
    .values({
      userId: user.id,
      originalImagePath: input.originalPath,
      prompt: input.prompt,
      presets: input.presets,
      variants: input.variants,
    })
    .returning({ id: schema.generationJobs.id });

  after(() => runGenerationJob(job.id));
  return ok<GenerateResponse>({ jobId: job.id }, { status: 202 });
});
