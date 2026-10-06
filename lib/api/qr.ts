import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { QrCodeString, type QrCodeInfo } from "@/lib/schemas";
import { HttpError } from "@/lib/api/http";
import { getDb, schema } from "@/lib/db";
import { appUrl } from "@/lib/env";

type QrRow = typeof schema.qrCodes.$inferSelect;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/1/i/l

export const newQrCode = (len = 8) => Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export const qrUrl = (code: string) => new URL(`/q/${code}`, appUrl()).toString();

export const isUsable = (q: QrRow, now = new Date()) =>
  q.active && (!q.expiresAt || q.expiresAt > now) && (q.maxUses === null || q.useCount < q.maxUses);

export async function loadQrByCode(rawCode: string): Promise<QrRow> {
  const parsed = QrCodeString.safeParse(rawCode);
  if (!parsed.success) throw new HttpError("not_found", "QR code not found");
  const code = parsed.data;
  const [row] = await getDb().select().from(schema.qrCodes).where(eq(schema.qrCodes.code, code));
  if (!row) throw new HttpError("not_found", "QR code not found");
  return row;
}

export const presentQr = (q: QrRow): QrCodeInfo => ({
  id: q.id,
  code: q.code,
  url: qrUrl(q.code),
  kind: q.kind,
  targetType: q.targetType,
  targetId: q.targetId,
  label: q.label,
  maxUses: q.maxUses,
  useCount: q.useCount,
  scanCount: q.scanCount,
  expiresAt: q.expiresAt?.toISOString() ?? null,
  active: q.active,
  createdAt: q.createdAt.toISOString(),
});
