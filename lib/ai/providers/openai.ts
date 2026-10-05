import OpenAI, { toFile } from "openai";
import type { EditedImage, ImageEditor } from "../image-editor";

export function openaiEditor(): ImageEditor {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI();
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

  return {
    name: `openai:${model}`,
    async edit(image, mimeType, instruction): Promise<EditedImage> {
      const res = await client.images.edit({
        model,
        image: await toFile(image, "photo.jpg", { type: mimeType }),
        prompt: instruction,
        n: 1,
        size: "auto",
        output_format: "jpeg",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI: no image returned");
      return { bytes: Buffer.from(b64, "base64"), mimeType: "image/jpeg" };
    },
  };
}
