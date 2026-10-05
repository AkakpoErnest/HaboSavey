import { GoogleGenAI } from "@google/genai";
import type { EditedImage, ImageEditor } from "../image-editor";

export function geminiEditor(): ImageEditor {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

  return {
    name: `gemini:${model}`,
    async edit(image, mimeType, instruction): Promise<EditedImage> {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: instruction }] }],
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) {
        const reason = res.candidates?.[0]?.finishReason ?? res.promptFeedback?.blockReason ?? "no image returned";
        throw new Error(`Gemini: ${reason}`);
      }
      return { bytes: Buffer.from(part.inlineData.data, "base64"), mimeType: part.inlineData.mimeType ?? "image/png" };
    },
  };
}
