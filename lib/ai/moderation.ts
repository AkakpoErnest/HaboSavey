import { complete } from "./claude";

export type ModerationResult = { blocked: boolean; labels: string[] };

const SYSTEM = `You moderate text for a public civic web app run with Kesennuma City, Japan.
Residents write titles, descriptions and image-edit prompts (Japanese or English) for ideas to improve local places.
Block ONLY: hate or harassment, sexual content, violence or threats, personal information about private people
(names with addresses, phone numbers), or spam/advertising. Criticism of the city, politics and blunt opinions are allowed.
Reply with JSON only: {"blocked": boolean, "labels": string[]} where labels are short snake_case reasons (empty if fine).`;

/**
 * Text moderation. Fails open (blocked=false, label "unchecked") when the AI is unavailable,
 * because every proposal still goes through the human moderation queue.
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  if (!text.trim()) return { blocked: false, labels: [] };
  const raw = await complete(SYSTEM, text.slice(0, 4000), 100);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { blocked: false, labels: ["unchecked"] };
  try {
    const parsed = JSON.parse(match[0]) as Partial<ModerationResult>;
    return {
      blocked: parsed.blocked === true,
      labels: Array.isArray(parsed.labels) ? parsed.labels.filter((l): l is string => typeof l === "string").slice(0, 5) : [],
    };
  } catch {
    return { blocked: false, labels: ["unchecked"] };
  }
}
