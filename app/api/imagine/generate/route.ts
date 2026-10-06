import { eq } from "drizzle-orm";
import { after } from "next/server";
import { ImagineGenerateInput, type ImagineGenerateResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { DAILY_LIMIT, generationsToday, runGenerationJob } from "@/lib/ai/run-job";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { IMAGINE_COST, pointsBalance, refundPoints, spendPoints } from "@/lib/points";
import { ownsPath } from "@/lib/storage";

export const maxDuration = 120;

/** Spends points, then renders 3 visions of the photo "in 5 years". Points are refunded if generation fails. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, ImagineGenerateInput);
  if (!ownsPath(user.id, input.originalPath)) throw new HttpError("forbidden", "Not your photo");
  if ((await generationsToday(user.id)) >= DAILY_LIMIT) throw new HttpError("rate_limited", `Up to ${DAILY_LIMIT} per day. Please try again tomorrow.`);

  const db = getDb();
  const prompt = `Show how this place could realistically look in 5 years (around 2031), improved for residents. ${input.wish}`.trim();
  const [job] = await db
    .insert(schema.generationJobs)
    .values({ userId: user.id, originalImagePath: input.originalPath, prompt, presets: input.presets, variants: 3 })
    .returning({ id: schema.generationJobs.id });

  if (!(await spendPoints(user.id, IMAGINE_COST, job.id))) {
    await db.delete(schema.generationJobs).where(eq(schema.generationJobs.id, job.id));
    throw new HttpError("forbidden", `This needs ${IMAGINE_COST} pt. Vote in a poll to earn points!`);
  }

  after(async () => {
    await runGenerationJob(job.id);
    const [done] = await getDb().select({ status: schema.generationJobs.status }).from(schema.generationJobs).where(eq(schema.generationJobs.id, job.id));
    if (done?.status === "failed") await refundPoints(user.id, IMAGINE_COST, job.id);
  });
  return ok<ImagineGenerateResponse>({ jobId: job.id, cost: IMAGINE_COST, balance: await pointsBalance(user.id) }, { status: 202 });
});
