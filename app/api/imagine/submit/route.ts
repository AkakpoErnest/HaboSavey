import { ImagineSubmitInput, type ImagineSubmitResponse } from "@/lib/schemas";
import { ok, parseJson, route } from "@/lib/api/http";
import { loadOwnedResult } from "@/lib/api/imagine";
import { uniqueSlug } from "@/lib/api/polls";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { download, upload } from "@/lib/storage";

/**
 * Submits a 5-year vision to the town: creates an OPEN A/B poll (A = today's photo, B = the vision) that is immediately available for public voting.
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, ImagineSubmitInput);
  const job = await loadOwnedResult(user, input.jobId, input.path);

  const a = `${user.id}/idea-${job.id}-a.jpg`;
  const b = `${user.id}/idea-${job.id}-b.jpg`;
  await upload("poll-images", a, await download("originals", job.originalImagePath), "image/jpeg");
  await upload("poll-images", b, await download("generated", input.path), "image/jpeg");

  const place = input.placeName.trim();
  const wish = input.wish.trim();
  const db = getDb();
  const [poll] = await db
    .insert(schema.polls)
    .values({
      slug: await uniqueSlug(`idea-${job.id.slice(0, 6)}`),
      titleJa: place ? `5年後の${place}` : "5年後のまちのアイデア",
      titleEn: place ? `${place} in 5 years` : "An idea for 5 years from now",
      questionJa: place ? `5年後の${place}、どちらがいいですか？` : "5年後、この場所はどちらがいいですか？",
      questionEn: "In 5 years, which do you prefer for this place?",
      descriptionJa: wish ? `住民のアイデア：「${wish}」（B はAIによるイメージです）` : "住民のアイデアです（B はAIによるイメージです）。",
      descriptionEn: wish ? `A resident's idea: "${wish}" (B is an AI concept image)` : "A resident's idea (B is an AI concept image).",
      optionAImagePath: a,
      optionALabelJa: "いまの景色",
      optionALabelEn: "Today",
      optionBImagePath: b,
      optionBLabelJa: "5年後のアイデア（AIイメージ）",
      optionBLabelEn: "In 5 years (AI concept)",
      status: "open",
      resultsVisibility: "after_vote",
      createdBy: user.id,
    })
    .returning({ id: schema.polls.id, slug: schema.polls.slug });
  await db.insert(schema.auditLog).values({
    actorId: user.id, action: "idea.submit", targetType: "poll", targetId: poll.id,
    meta: { jobId: job.id, wish, place, feedback: input.feedbackSummary },
  });
  return ok<ImagineSubmitResponse>({ submitted: true, pollSlug: poll.slug ?? poll.id });
});
