import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;
export const TEXT_MODEL = process.env.ANTHROPIC_TEXT_MODEL ?? "claude-haiku-4-5";

/** Null when ANTHROPIC_API_KEY isn't set; callers fall back to non-AI behaviour. */
export function claude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

/** One-shot text completion; returns "" on any failure so callers can fall back. */
export async function complete(system: string, user: string, maxTokens = 400): Promise<string> {
  const c = claude();
  if (!c) return "";
  try {
    const res = await c.messages.create({
      model: TEXT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    console.error("[ai] claude", err);
    return "";
  }
}
