import { isLocalMode } from "@/lib/env";
import { geminiEditor } from "./providers/gemini";
import { mockEditor } from "./providers/mock";
import { openaiEditor } from "./providers/openai";

export type EditedImage = { bytes: Buffer; mimeType: string };

/** Provider-agnostic "make this photo better" interface. Pick with IMAGE_EDIT_PROVIDER. */
export interface ImageEditor {
  name: string;
  edit(image: Buffer, mimeType: string, instruction: string): Promise<EditedImage>;
}

export function getImageEditor(): ImageEditor {
  const provider = (process.env.IMAGE_EDIT_PROVIDER ?? "gemini").toLowerCase();
  const hasKey = provider === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.GEMINI_API_KEY;
  if (provider === "mock" || (!hasKey && isLocalMode())) return mockEditor();
  if (provider === "openai") return openaiEditor();
  if (provider === "gemini") return geminiEditor();
  throw new Error(`Unknown IMAGE_EDIT_PROVIDER "${provider}"`);
}
