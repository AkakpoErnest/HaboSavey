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
  "Keep the same camera viewpoint, perspective, lighting and weather.",
  "Keep existing landmarks, the sea, mountains, boats and main buildings recognisable.",
  "Make realistic, buildable improvements that fit a Japanese harbour town. Do not add text, logos or people's faces.",
].join(" ");

const POLISH_SYSTEM = `Rewrite a resident's idea for improving a place (Japanese or English) as a short, concrete English
image-edit instruction (max 60 words). Keep their intent; drop anything unrelated to changing the scene.
Output only the instruction.`;

export async function buildEditInstruction(userPrompt: string, presets: Preset[]): Promise<string> {
  const trimmed = userPrompt.trim();
  const polished = trimmed ? (await complete(POLISH_SYSTEM, trimmed, 200)) || trimmed : "";
  const changes = [polished, ...presets.map((p) => PRESET_TEXT[p])].filter(Boolean);
  return `${BASE}\nChanges to make: ${changes.join("; ")}.`;
}

/** Slight variation per variant so results aren't near-identical. */
export const VARIANT_HINTS = [
  "",
  "Interpret the changes boldly.",
  "Interpret the changes subtly and modestly.",
  "Emphasise how people would use the space.",
];
