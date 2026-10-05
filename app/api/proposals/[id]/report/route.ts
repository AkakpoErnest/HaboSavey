import { and, eq } from "drizzle-orm";
import { ReportInput } from "@/lib/schemas";
import { ok, parseJson, route, type Params } from "@/lib/api/http";
import { loadProposal } from "@/lib/api/proposals";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const POST = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const { reason, note } = await parseJson(req, ReportInput);
  await loadProposal(id, user); // 404 if not visible

  const db = getDb();
  const [existing] = await db
    .select({ id: schema.reports.id })
    .from(schema.reports)
    .where(and(eq(schema.reports.targetId, id), eq(schema.reports.reporterId, user.id), eq(schema.reports.status, "open")));
  if (!existing) {
    await db.insert(schema.reports).values({ targetType: "proposal", targetId: id, reporterId: user.id, reason, note });
  }
  return ok({ reported: true });
});
