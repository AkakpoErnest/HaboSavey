import { z } from "zod";
import { Id, IsoDate } from "./common";

export const QrKind = z.enum(["verify_local", "link"]);
export type QrKind = z.infer<typeof QrKind>;
export const QrTargetType = z.enum(["survey", "challenge", "place", "poll"]);
export type QrTargetType = z.infer<typeof QrTargetType>;

/** Codes are short, URL-safe and case-insensitive. Generated ones avoid 0/o/1/i/l. */
export const QrCodeString = z.string().regex(/^[a-z0-9]{4,32}$/i).transform((s) => s.toLowerCase());

/**
 * GET /api/qr/:code. Public: what a scanned code points to. Also counts the scan.
 * Frontend page /[locale]/q/[code] calls this, then:
 *  - link → poll: /p/:id?via=<code> · survey: /surveys/:id · challenge: /challenges/:id · place: /create?placeId=:id
 *  - verify_local → ask to sign in if needed, then POST /api/qr/:code/redeem
 */
export const QrResolveResponse = z.object({
  kind: QrKind,
  label: z.string(),
  target: z.object({ type: QrTargetType, id: Id }).nullable(),
  /** False when expired, deactivated or used up. */
  usable: z.boolean(),
});
export type QrResolveResponse = z.infer<typeof QrResolveResponse>;

/** POST /api/qr/:code/redeem (signed in, verify_local codes only). */
export const QrRedeemResponse = z.object({ verifiedLocal: z.literal(true), alreadyVerified: z.boolean() });
export type QrRedeemResponse = z.infer<typeof QrRedeemResponse>;

/** Staff view of a QR code. `url` is what the printed QR encodes. */
export const QrCodeInfo = z.object({
  id: Id,
  code: z.string(),
  url: z.string().url(),
  kind: QrKind,
  targetType: QrTargetType.nullable(),
  targetId: Id.nullable(),
  label: z.string(),
  maxUses: z.number().int().nullable(),
  useCount: z.number().int(),
  scanCount: z.number().int(),
  expiresAt: IsoDate.nullable(),
  active: z.boolean(),
  createdAt: IsoDate,
});
export type QrCodeInfo = z.infer<typeof QrCodeInfo>;

/** POST /api/admin/qr (staff) */
export const CreateQrInput = z
  .object({
    kind: QrKind,
    targetType: QrTargetType.optional(),
    targetId: Id.optional(),
    label: z.string().min(1).max(120),
    maxUses: z.number().int().positive().optional(),
    expiresAt: IsoDate.optional(),
  })
  .refine((v) => v.kind === "verify_local" || (v.targetType && v.targetId), {
    message: "Link QR codes need a targetType and targetId",
    path: ["targetId"],
  });
export type CreateQrInput = z.infer<typeof CreateQrInput>;

/** PATCH /api/admin/qr/:id (staff) */
export const UpdateQrInput = z.object({ active: z.boolean().optional(), label: z.string().min(1).max(120).optional() });

export const QrListResponse = z.object({ codes: z.array(QrCodeInfo) });
export type QrListResponse = z.infer<typeof QrListResponse>;
