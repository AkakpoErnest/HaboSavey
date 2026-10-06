import OpenAI from "openai";
import { z } from "zod";
import type { Preset } from "@/lib/schemas";

/**
 * AI feedback on a resident's "Kesennuma in 5 years" vision. Uses OpenAI (vision + structured output) when
 * OPENAI_API_KEY is set; otherwise returns clearly-labelled demo feedback so the flow can be tried without a key.
 */
export const IdeaFeedback = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  considerations: z.array(z.string()),
  questionsForCity: z.array(z.string()),
  demo: z.boolean(),
});
export type IdeaFeedback = z.infer<typeof IdeaFeedback>;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "strengths", "considerations", "questionsForCity"],
  properties: {
    summary: { type: "string", description: "1–2 friendly sentences describing the vision" },
    strengths: { type: "array", items: { type: "string" }, description: "2–3 concrete benefits for residents" },
    considerations: { type: "array", items: { type: "string" }, description: "2–4 practical points: cost/maintenance, tsunami safety, accessibility, harbour work, winter" },
    questionsForCity: { type: "array", items: { type: "string" }, description: "1–2 questions the city could answer" },
  },
} as const;

const SYSTEM = (ja: boolean) =>
  `You give warm, practical feedback on residents' ideas for how a place in Kesennuma (a fishing port city in Miyagi, Japan,
rebuilt after the 2011 tsunami) could look in 5 years. You see the current photo and an AI concept image. Be encouraging and
concrete; mention realistic considerations (maintenance in a cold coastal climate, tsunami evacuation and the seawall,
accessibility for older residents, fishing-port operations, cost). Never invent facts about specific city plans.
Write in ${ja ? "natural, friendly Japanese" : "plain, friendly English"}. Keep each item short (one sentence).`;

export async function ideaFeedback(input: {
  original: Buffer;
  generated: Buffer;
  wish: string;
  presets: Preset[];
  locale: "ja" | "en";
}): Promise<IdeaFeedback> {
  const ja = input.locale === "ja";
  if (!process.env.OPENAI_API_KEY) return demoFeedback(input.presets, ja);

  try {
    return await openaiFeedback(input, ja);
  } catch (err) {
    // No credits, rate limit or outage: keep the flow working with clearly-labelled demo feedback.
    console.error("[ai] OpenAI feedback failed, using demo feedback", (err as Error).message);
    return demoFeedback(input.presets, ja);
  }
}

async function openaiFeedback(
  input: { original: Buffer; generated: Buffer; wish: string; presets: Preset[] },
  ja: boolean,
): Promise<IdeaFeedback> {
  const client = new OpenAI();
  const img = (b: Buffer) => ({ type: "input_image" as const, detail: "low" as const, image_url: `data:image/jpeg;base64,${b.toString("base64")}` });
  const res = await client.responses.create({
    model: process.env.OPENAI_FEEDBACK_MODEL ?? "gpt-5-mini",
    instructions: SYSTEM(ja),
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `Resident's wish: ${input.wish || "(none)"}\nThemes: ${input.presets.join(", ") || "(none)"}\nImage 1 = today. Image 2 = AI concept in 5 years.` },
          img(input.original),
          img(input.generated),
        ],
      },
    ],
    text: { format: { type: "json_schema", name: "idea_feedback", schema: SCHEMA, strict: true } },
  });
  const parsed = JSON.parse(res.output_text);
  return IdeaFeedback.parse({ ...parsed, demo: false });
}

const DEMO: Record<Preset, { ja: [string, string]; en: [string, string] }> = {
  greenery: { ja: ["緑が増えて、歩くのが楽しくなりそうです。", "海風と冬の寒さに強い樹種の選定と、手入れの担い手が必要です。"], en: ["More greenery makes walking more pleasant.", "Choose trees that tolerate sea wind and cold winters, and plan who maintains them."] },
  seating: { ja: ["高齢の方も休みながら散歩できます。", "背もたれ付きのベンチと日よけがあると安心です。"], en: ["Older residents can rest along the way.", "Benches with backrests and some shade would help."] },
  lighting: { ja: ["夜も安心して歩ける海辺になります。", "まぶしさや電気代、海鳥への影響に配慮が必要です。"], en: ["The waterfront feels safer in the evening.", "Consider glare, running costs and impact on seabirds."] },
  accessibility: { ja: ["車いすやベビーカーでも利用しやすくなります。", "段差や傾斜の基準、点字ブロックの位置を確認しましょう。"], en: ["Easier for wheelchairs and strollers.", "Check slope standards, step-free routes and tactile paving."] },
  tsunami_safe: { ja: ["避難のわかりやすさが高まります。", "避難路と防潮堤の機能を妨げない設計が前提です。"], en: ["Evacuation becomes clearer.", "The design must not block evacuation routes or the seawall."] },
  festival: { ja: ["人が集まるにぎわいの場所になりそうです。", "騒音・ゴミ・漁港の作業との両立を考えましょう。"], en: ["It could become a lively gathering place.", "Balance noise, litter and fishing-port operations."] },
};

function demoFeedback(presets: Preset[], ja: boolean): IdeaFeedback {
  const picks = (presets.length ? presets : (["greenery", "seating"] as Preset[])).slice(0, 3);
  const L = (p: Preset) => (ja ? DEMO[p].ja : DEMO[p].en);
  return {
    summary: ja ? "（デモのフィードバックです）5年後の、より過ごしやすい気仙沼の姿が描かれています。" : "(Demo feedback) A more welcoming Kesennuma in 5 years.",
    strengths: picks.map((p) => L(p)[0]),
    considerations: picks.map((p) => L(p)[1]),
    questionsForCity: [ja ? "この場所で予定されている整備計画はありますか？" : "Are there existing plans for this location?"],
    demo: true,
  };
}
