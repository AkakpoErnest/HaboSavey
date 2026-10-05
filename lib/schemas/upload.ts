import { z } from "zod";

/** poll-images: staff only. */
export const UploadBucket = z.enum(["originals", "survey-uploads", "poll-images"]);

/** POST /api/uploads: the client then PUTs the file to `uploadUrl`. */
export const CreateUploadInput = z.object({
  bucket: UploadBucket.default("originals"),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
});
export type CreateUploadInput = z.infer<typeof CreateUploadInput>;

export const CreateUploadResponse = z.object({
  uploadUrl: z.string().url(),
  token: z.string(),
  path: z.string(),
});
export type CreateUploadResponse = z.infer<typeof CreateUploadResponse>;
