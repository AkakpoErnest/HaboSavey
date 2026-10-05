import { z } from "zod";
import { Id } from "./common";

/** Preset chips shown in the create flow (🌳🪑💡♿🌊🏮). */
export const Preset = z.enum([
  "greenery",
  "seating",
  "lighting",
  "accessibility",
  "tsunami_safe",
  "festival",
]);
export type Preset = z.infer<typeof Preset>;

/** POST /api/generate */
export const GenerateInput = z
  .object({
    originalPath: z.string().min(1),
    prompt: z.string().max(1000).default(""),
    presets: z.array(Preset).max(6).default([]),
    variants: z.number().int().min(1).max(4).default(3),
  })
  .refine((v) => v.prompt.trim().length > 0 || v.presets.length > 0, {
    message: "Give a prompt or at least one preset",
    path: ["prompt"],
  });
export type GenerateInput = z.infer<typeof GenerateInput>;

export const GenerateResponse = z.object({ jobId: Id });
export type GenerateResponse = z.infer<typeof GenerateResponse>;

export const JobStatus = z.enum(["queued", "running", "done", "failed"]);
export type JobStatus = z.infer<typeof JobStatus>;

/** GET /api/generate/:jobId. Poll every ~2 s until status is done or failed. */
export const GenerationJobResponse = z.object({
  id: Id,
  status: JobStatus,
  /** Pass `path` back as `generatedPath` in POST /api/proposals. */
  results: z.array(z.object({ path: z.string(), url: z.string().url() })),
  error: z.string().nullable(),
  remainingToday: z.number().int(),
});
export type GenerationJobResponse = z.infer<typeof GenerationJobResponse>;
