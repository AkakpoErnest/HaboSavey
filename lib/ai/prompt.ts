import type { Preset } from "@/lib/schemas";
import { complete } from "./claude";

const PRESET_TEXT: Record<Preset, string> = {
  greenery: "add trees, planters and flowers that suit a cool coastal climate in northern Japan",
  seating: "add comfortable benches and places to rest, including some with backrests for older people",
  lighting: "add warm, safe evening street lighting",
  accessibility: "make it barrier-free: smooth level paths, gentle ramps, handrails and tactile paving",
  tsunami_safe: "show clear tsunami evacuation signage and routes toward higher ground, keeping the seawall",
  festival: "dress it for a local summer festival with lanterns and food stalls",
};

/** Keeps every edit grounded in the real photo so the town compares realistic ideas. */
const BASE = [
  "Edit this real photograph of a place in Kesennuma, a fishing port city in Miyagi, Japan.",
  "Keep the same camera viewpoint, framing, perspective, lighting and weather unless the requested edit explicitly changes them.",
  "Preserve the original scene: keep existing landmarks, coastline, sea, mountains, boats, buildings and roads in their original positions, shapes and proportions.",
  "Change only the objects or areas explicitly requested below. Leave all other areas as close to the source photograph as possible; do not redesign the whole scene or invent additional improvements.",
  "Fit requested additions into the existing space with realistic scale, perspective and occlusion. Only change viewpoint, lighting or weather when explicitly requested.",
  "Make realistic, buildable improvements that fit a Japanese harbour town. Do not add text, logos or people's faces.",
].join(" ");

const POLISH_SYSTEM = `Rewrite a resident's idea for improving a place (Japanese or English) as a short, concrete English
image-edit instruction (max 60 words). Keep their intent; drop anything unrelated to changing the scene.
Do not invent additional improvements, objects or changes to the viewpoint or surroundings.
Output only the instruction.`;

export async function buildEditInstruction(userPrompt: string, presets: Preset[]): Promise<string> {
  const trimmed = userPrompt.trim();
  const polished = trimmed ? (await complete(POLISH_SYSTEM, trimmed, 200)) || trimmed : "";
  const changes = [polished, ...presets.map((p) => PRESET_TEXT[p])].filter(Boolean);
  return preserveSourceScene(changes.join("; "));
}

/** Shared guardrails also cover staff prompts that skip resident text polishing. */
export function preserveSourceScene(changes: string): string {
  return `${BASE}\nRequested changes: ${changes.trim()}\nPreserve everything outside those requested changes. Render an edit of the supplied photo.`;
}

/** Vary requested additions without expanding the scope of the edit. */
export const VARIANT_HINTS = [
  "",
  "Use an alternative design for the requested additions only; keep their scope and the surrounding scene unchanged.",
  "Use a subtle, modest design for the requested additions only; preserve the surrounding scene.",
  "Vary the materials or arrangement of requested additions only; do not add unrequested people or objects.",
];
