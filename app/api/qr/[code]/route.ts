import { eq, sql } from "drizzle-orm";
import { type QrResolveResponse } from "@/lib/schemas";
import { ok, route, type Params } from "@/lib/api/http";
import { isUsable, loadQrByCode } from "@/lib/api/qr";
import { getDb, schema } from "@/lib/db";

/** Public: what a scanned QR code points to. */
export const GET = route<Params<"code">>(async (_req, { params }) => {
  const { code } = await params;
  const qr = await loadQrByCode(code);
  await getDb()
    .update(schema.qrCodes)
    .set({ scanCount: sql`${schema.qrCodes.scanCount} + 1` })
    .where(eq(schema.qrCodes.id, qr.id));
  return ok<QrResolveResponse>({
    kind: qr.kind,
    label: qr.label,
    target: qr.targetType && qr.targetId ? { type: qr.targetType, id: qr.targetId } : null,
    usable: isUsable(qr),
  });
});
