import { randomUUID } from "node:crypto";
import { CreateUploadInput, type CreateUploadResponse } from "@/lib/schemas";
import { ok, parseJson, route } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { createUploadUrl } from "@/lib/storage";

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/** Returns a signed upload URL. The client PUTs the file there (Content-Type = contentType). */
export const POST = route(async (req) => {
  const user = await requireUser();
  const { bucket, contentType } = await parseJson(req, CreateUploadInput);
  const path = `${user.id}/${randomUUID()}.${EXT[contentType]}`;
  const { uploadUrl, token } = await createUploadUrl(bucket, path);
  return ok<CreateUploadResponse>({ uploadUrl, token, path });
});
