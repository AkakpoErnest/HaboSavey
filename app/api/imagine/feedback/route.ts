import { ImagineFeedbackInput, type ImagineFeedbackResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { ideaFeedback } from "@/lib/ai/feedback";
import { loadOwnedResult } from "@/lib/api/imagine";
import { requireUser } from "@/lib/auth";
import { download } from "@/lib/storage";

export const maxDuration = 60;

/** AI feedback (OpenAI vision) on the chosen 5-year vision. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, ImagineFeedbackInput);
  const job = await loadOwnedResult(user, input.jobId, input.path);
  try {
    const feedback = await ideaFeedback({
      original: await download("originals", job.originalImagePath),
      generated: await download("generated", input.path),
      wish: input.wish,
      presets: input.presets,
      locale: input.locale,
    });
    return ok<ImagineFeedbackResponse>(feedback);
  } catch (err) {
    console.error("[imagine] feedback failed", err);
    throw new HttpError("internal", "The AI couldn't give feedback right now. Please try again.");
  }
});
