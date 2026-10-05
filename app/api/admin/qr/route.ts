import { desc, eq } from "drizzle-orm";
import { CreateQrInput, type QrListResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { newQrCode, presentQr } from "@/lib/api/qr";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const GET = route(async () => {
  await requireStaff();
  const rows = await getDb().select().from(schema.qrCodes).orderBy(desc(schema.qrCodes.createdAt));
  return ok<QrListResponse>({ codes: rows.map(presentQr) });
});

const TARGET_TABLE = { survey: schema.surveys, challenge: schema.challenges, place: schema.places, poll: schema.polls } as const;

export const POST = route(async (req) => {
  const staff = await requireStaff();
  const input = await parseJson(req, CreateQrInput);
  const db = getDb();
  if (input.kind === "link" && input.targetType && input.targetId) {
    const table = TARGET_TABLE[input.targetType];
    const [target] = await db.select({ id: table.id }).from(table).where(eq(table.id, input.targetId));
    if (!target) throw new HttpError("bad_request", `${input.targetType} not found`);
  }
  const [row] = await db
    .insert(schema.qrCodes)
    .values({
      code: newQrCode(),
      kind: input.kind,
      targetType: input.kind === "link" ? input.targetType : null,
      targetId: input.kind === "link" ? input.targetId : null,
      label: input.label,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: staff.id,
    })
    .returning();
  await db.insert(schema.auditLog).values({ actorId: staff.id, action: "qr.create", targetType: "qr_code", targetId: row.id });
  return ok({ code: presentQr(row) }, { status: 201 });
});
