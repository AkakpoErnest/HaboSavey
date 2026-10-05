import { eq } from "drizzle-orm";
import { UpdateQrInput } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { presentQr } from "@/lib/api/qr";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const PATCH = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const staff = await requireStaff();
  const input = await parseJson(req, UpdateQrInput);
  const [row] = await getDb().update(schema.qrCodes).set(input).where(eq(schema.qrCodes.id, id)).returning();
  if (!row) throw new HttpError("not_found", "QR code not found");
  await getDb().insert(schema.auditLog).values({ actorId: staff.id, action: "qr.update", targetType: "qr_code", targetId: id, meta: input });
  return ok({ code: presentQr(row) });
});
