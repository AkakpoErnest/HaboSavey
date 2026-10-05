import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { type QrRedeemResponse } from "@/lib/schemas";
import { HttpError, ok, route, type Params } from "@/lib/api/http";
import { isUsable, loadQrByCode } from "@/lib/api/qr";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

/** Scanning a city-issued verify_local QR marks the signed-in user as a verified Kesennuma resident. */
export const POST = route<Params<"code">>(async (_req, { params }) => {
  const { code } = await params;
  const user = await requireUser();
  const qr = await loadQrByCode(code);
  if (qr.kind !== "verify_local") throw new HttpError("bad_request", "This QR code is not a resident verification code");
  if (user.verifiedLocal) return ok<QrRedeemResponse>({ verifiedLocal: true, alreadyVerified: true });
  if (!isUsable(qr)) throw new HttpError("conflict", "This QR code has expired or been used up");

  await getDb().transaction(async (tx) => {
    const [redemption] = await tx
      .insert(schema.qrRedemptions)
      .values({ qrId: qr.id, userId: user.id })
      .onConflictDoNothing()
      .returning();
    if (redemption) {
      // Atomic use-count bump that also enforces max_uses under concurrent scans.
      const bumped = await tx
        .update(schema.qrCodes)
        .set({ useCount: sql`${schema.qrCodes.useCount} + 1` })
        .where(
          and(
            eq(schema.qrCodes.id, qr.id),
            or(isNull(schema.qrCodes.maxUses), lt(schema.qrCodes.useCount, schema.qrCodes.maxUses)),
          ),
        )
        .returning({ id: schema.qrCodes.id });
      if (bumped.length === 0) throw new HttpError("conflict", "This QR code has been used up");
    }
    await tx.update(schema.users).set({ verifiedLocal: true }).where(eq(schema.users.id, user.id));
    await tx
      .insert(schema.auditLog)
      .values({ actorId: user.id, action: "qr.verify_local", targetType: "qr_code", targetId: qr.id });
  });
  return ok<QrRedeemResponse>({ verifiedLocal: true, alreadyVerified: false });
});
