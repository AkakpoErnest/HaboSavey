import { and, count, eq, gte } from "drizzle-orm";
import type { Preset } from "@/lib/schemas";
import { getDb, schema } from "@/lib/db";
import { cleanImage } from "@/lib/privacy/clean-image";
import { download, upload, type Bucket } from "@/lib/storage";
import { getImageEditor } from "./image-editor";
import { moderateText } from "./moderation";
import { buildEditInstruction, preserveSourceScene, VARIANT_HINTS } from "./prompt";

export const DAILY_LIMIT = Number(process.env.GENERATIONS_PER_USER_PER_DAY ?? 10);

/** Start of "today" in Japan time (UTC+9, no DST). */
export function startOfJstDay(now = new Date()): Date {
  const jst = new Date(now.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - 9 * 3600_000);
}

export async function generationsToday(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.generationJobs)
    .where(and(eq(schema.generationJobs.userId, userId), gte(schema.generationJobs.createdAt, startOfJstDay())));
  return row?.n ?? 0;
}

export const sourceBucketOf = (b: string): Bucket => (b === "poll-images" ? "poll-images" : "originals");
/** Poll options stay in poll-images; resident proposals go to generated. */
export const outputBucket = (sourceBucket: string): Bucket => (sourceBucket === "poll-images" ? "poll-images" : "generated");

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Runs one job end to end. Never throws: failures are recorded on the job row. */
export async function runGenerationJob(jobId: string): Promise<void> {
  const db = getDb();
  const setJob = (values: Partial<typeof schema.generationJobs.$inferInsert>) =>
    db.update(schema.generationJobs).set(values).where(eq(schema.generationJobs.id, jobId));

  const [job] = await db.select().from(schema.generationJobs).where(eq(schema.generationJobs.id, jobId));
  if (!job || job.status !== "queued") return;

  try {
    const editor = getImageEditor();
    await setJob({ status: "running", provider: editor.name });

    const flags = await moderateText(job.prompt);
    if (flags.blocked) throw new UserFacingError("Please rephrase your idea and try again.");

    // Strip EXIF/GPS and normalise. The cleaned image replaces the original upload, so the
    // "before" photo shown publicly never carries metadata.
    const src = sourceBucketOf(job.sourceBucket);
    const original = await cleanImage(await download(src, job.originalImagePath));
    await upload(src, job.originalImagePath, original, "image/jpeg");

    const instruction = job.rawPrompt ? preserveSourceScene(job.prompt) : await buildEditInstruction(job.prompt, job.presets as Preset[]);
    const settled = await Promise.allSettled(
      Array.from({ length: job.variants }, (_, i) =>
        editor.edit(original, "image/jpeg", `${instruction} ${VARIANT_HINTS[i % VARIANT_HINTS.length]}`.trim()),
      ),
    );

    const paths: string[] = [];
    for (const [i, r] of settled.entries()) {
      if (r.status !== "fulfilled") {
        console.error("[ai] variant failed", jobId, i, r.reason);
        continue;
      }
      const path = `${job.userId}/${job.id}-${i}.${EXT[r.value.mimeType] ?? "png"}`;
      await upload(outputBucket(job.sourceBucket), path, r.value.bytes, r.value.mimeType);
      paths.push(path);
    }
    if (paths.length === 0) throw new UserFacingError("The AI couldn't create an image this time. Please try again.");

    await setJob({ status: "done", resultPaths: paths, finishedAt: new Date() });
  } catch (err) {
    console.error("[ai] job failed", jobId, err);
    await setJob({
      status: "failed",
      error: err instanceof UserFacingError ? err.message : "Image generation failed. Please try again.",
      finishedAt: new Date(),
    });
  }
}

class UserFacingError extends Error {}
