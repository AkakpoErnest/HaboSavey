import { z } from "zod";
import { Id } from "./common";
import { Preset } from "./generate";

/** "Kesennuma in 5 years": photo → AI visions (costs points) → AI feedback → submit as a draft A/B poll for staff review. */
export const ImagineGenerateInput = z.object({
  originalPath: z.string().min(1),
  wish: z.string().max(500).default(""),
  presets: z.array(Preset).max(6).default([]),
}).refine((v) => v.wish.trim().length > 0 || v.presets.length > 0, { message: "Tell us your wish or pick a theme", path: ["wish"] });
export type ImagineGenerateInput = z.infer<typeof ImagineGenerateInput>;
export const ImagineGenerateResponse = z.object({ jobId: Id, cost: z.number().int(), balance: z.number().int() });
export type ImagineGenerateResponse = z.infer<typeof ImagineGenerateResponse>;

export const ImagineFeedbackInput = z.object({
  jobId: Id,
  path: z.string().min(1),
  wish: z.string().max(500).default(""),
  presets: z.array(Preset).max(6).default([]),
  locale: z.enum(["ja", "en"]).default("ja"),
});
export const ImagineFeedbackResponse = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  considerations: z.array(z.string()),
  questionsForCity: z.array(z.string()),
  /** True when no OpenAI key is configured (sample feedback). */
  demo: z.boolean(),
});
export type ImagineFeedbackResponse = z.infer<typeof ImagineFeedbackResponse>;

export const ImagineSubmitInput = z.object({
  jobId: Id,
  path: z.string().min(1),
  wish: z.string().max(500).default(""),
  placeName: z.string().max(80).default(""),
  feedbackSummary: z.string().max(1000).default(""),
});
export const ImagineSubmitResponse = z.object({ submitted: z.literal(true), pollSlug: z.string() });
export type ImagineSubmitResponse = z.infer<typeof ImagineSubmitResponse>;

/** GET /api/imagine/info: cost, balance, and whether real AI is on (else demo images/feedback). */
export const ImagineInfoResponse = z.object({ cost: z.number().int(), balance: z.number().int(), signedIn: z.boolean(), realAi: z.boolean() });
export type ImagineInfoResponse = z.infer<typeof ImagineInfoResponse>;
