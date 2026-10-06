import { eq, sql } from "drizzle-orm";
import { type QrResolveResponse } from "@/lib/schemas";
import { ok, route, type Params } from "@/lib/api/http";
import { isUsable, loadQrByCode } from "@/lib/api/qr";
import { getCurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { awardPoints, jstDate } from "@/lib/points";

/** Public: what a scanned QR code points to. */
export const GET = route<Params<"code">>(async (_req, { params }) => {
  const { code } = await params;
  const qr = await loadQrByCode(code);
  await getDb()
    .update(schema.qrCodes)
    .set({ scanCount: sql`${schema.qrCodes.scanCount} + 1` })
    .where(eq(schema.qrCodes.id, qr.id));
  // On-site check-in points: link codes only, once per code per day (JST).
  const pointsAwarded =
    qr.kind === "link" && isUsable(qr) ? await awardPoints(await getCurrentUser(), "qr_checkin", `${qr.id}:${jstDate()}`) : 0;
  return ok<QrResolveResponse>({
    kind: qr.kind,
    label: qr.label,
    target: qr.targetType && qr.targetId ? { type: qr.targetType, id: qr.targetId } : null,
    usable: isUsable(qr),
    pointsAwarded,
  });
});
