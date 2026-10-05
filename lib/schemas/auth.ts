import { z } from "zod";
import { Locale } from "./common";

/** POST /api/auth/magic-link: emails a one-tap sign-in link. */
export const MagicLinkInput = z.object({
  email: z.string().email(),
  locale: Locale.default("ja"),
  /** Path to return to after sign-in, e.g. "/ja/create". Must start with "/". */
  next: z.string().regex(/^\/(?!\/)/).default("/"),
});
export type MagicLinkInput = z.infer<typeof MagicLinkInput>;

export const MagicLinkResponse = z.object({
  sent: z.literal(true),
  /** Local mode only: already signed in, so skip "check your email" and go to `next`. */
  devSignedIn: z.boolean().optional(),
});
export type MagicLinkResponse = z.infer<typeof MagicLinkResponse>;
