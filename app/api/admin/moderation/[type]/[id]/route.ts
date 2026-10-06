import { and, eq } from "drizzle-orm";
import { ModerationDecisionInput, ModerationTargetType } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { awardPoints } from "@/lib/points";

const STATUS = { approve: "approved", reject: "rejected", hide: "hidden" } as const;

export const PATCH = route<Params<"type" | "id">>(async (req, { params }) => {
  const { type: rawType, id } = await params;
  const type = ModerationTargetType.parse(rawType);
  const staff = await requireStaff();
  const { decision, note } = await parseJson(req, ModerationDecisionInput);
  const status = STATUS[decision];
  const db = getDb();

  await db.transaction(async (tx) => {
    const table = type === "proposal" ? schema.proposals : schema.comments;
    const updated = await tx.update(table).set({ status }).where(eq(table.id, id)).returning({ id: table.id });
    if (updated.length === 0) throw new HttpError("not_found", `${type} not found`);
    await tx
      .update(schema.reports)
      .set({ status: decision === "approve" ? "dismissed" : "resolved" })
      .where(and(eq(schema.reports.targetType, type), eq(schema.reports.targetId, id), eq(schema.reports.status, "open")));
    if (type === "proposal" && decision !== "approve") {
      // Hidden/rejected proposals can't hold votes; voters can pick again.
      await tx.delete(schema.votes).where(eq(schema.votes.proposalId, id));
    }
    await tx.insert(schema.auditLog).values({ actorId: staff.id, action: `moderation.${decision}`, targetType: type, targetId: id, meta: { note } });
  });
  if (type === "proposal" && decision === "approve") {
    const [author] = await db
      .select({ id: schema.users.id, verifiedLocal: schema.users.verifiedLocal })
      .from(schema.users)
      .innerJoin(schema.proposals, eq(schema.proposals.authorId, schema.users.id))
      .where(eq(schema.proposals.id, id));
    await awardPoints(author ?? null, "proposal_approved", id);
  }
  return ok({ id, status });
});
