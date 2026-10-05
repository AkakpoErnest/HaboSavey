import { z } from "zod";

export const Id = z.string().uuid();
export const IsoDate = z.string().datetime({ offset: true });
export const Locale = z.enum(["ja", "en"]);
export type Locale = z.infer<typeof Locale>;

export const Role = z.enum(["resident", "staff", "admin"]);
export type Role = z.infer<typeof Role>;

export const LatLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Kesennuma postal codes are 〒988-xxxx. Accepts "9880000" or "988-0000". */
export const KesennumaPostalCode = z
  .string()
  .regex(/^988-?\d{4}$/, "Kesennuma postal codes start with 988");

/** Every error response from /api/* has this shape. */
export const ApiError = z.object({
  error: z.object({
    code: z.enum([
      "bad_request",
      "unauthorized",
      "forbidden",
      "not_found",
      "conflict",
      "rate_limited",
      "moderation_rejected",
      "internal",
    ]),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
export type ApiErrorCode = ApiError["error"]["code"];
