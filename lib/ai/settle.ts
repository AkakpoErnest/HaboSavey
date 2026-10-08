import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { refundPoints } from "@/lib/points";
import { requireSecret } from "@/lib/secrets";
import { runGenerationJob } from "./run-job";

/** Shared by the Next.js routes and the Netlify background function, so nothing here may import next/*. */
export const signJob = (jobId: string) => createHmac("sha256", requireSecret("DEV_STORAGE_SECRET", "citizen-sentiment-local-storage")).update(`job:${jobId}`).digest("base64url");

export function verifyJobSignature(jobId: string, sig: string): boolean {
  const a = Buffer.from(signJob(jobId)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Runs the job, then gives back any points it cost if it failed (refunds are idempotent per job). */
export async function settleJob(jobId: string): Promise<void> {
  await runGenerationJob(jobId);
  const db = getDb();
  const [job] = await db.select({ status: schema.generationJobs.status, userId: schema.generationJobs.userId }).from(schema.generationJobs).where(eq(schema.generationJobs.id, jobId));
  if (job?.status !== "failed") return;
  const [spend] = await db.select({ amount: schema.pointsLedger.amount }).from(schema.pointsLedger)
    .where(and(eq(schema.pointsLedger.userId, job.userId), eq(schema.pointsLedger.reason, "ai_generation"), eq(schema.pointsLedger.refId, jobId)));
  if (spend) await refundPoints(job.userId, -spend.amount, jobId);
}

