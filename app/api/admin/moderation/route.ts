import { and, asc, count, eq, inArray, or } from "drizzle-orm";
import type { ModerationItem, ModerationQueueResponse } from "@/lib/schemas";
import { ok, route } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

/** Pending proposals plus approved ones with open reports. */
export const GET = route(async () => {
  await requireStaff();
  const db = getDb();

  const reportCounts = await db
    .select({ targetId: schema.reports.targetId, n: count() })
    .from(schema.reports)
    .where(and(eq(schema.reports.targetType, "proposal"), eq(schema.reports.status, "open")))
    .groupBy(schema.reports.targetId);
  const reportsById = new Map(reportCounts.map((r) => [r.targetId, r.n]));
  const reportedIds = [...reportsById.keys()];

  const all = await db
    .select({ p: schema.proposals, author: schema.users.displayName })
    .from(schema.proposals)
    .innerJoin(schema.users, eq(schema.users.id, schema.proposals.authorId))
    .where(
      or(
        eq(schema.proposals.status, "pending"),
        reportedIds.length
          ? and(eq(schema.proposals.status, "approved"), inArray(schema.proposals.id, reportedIds))
          : undefined,
      ),
    )
    .orderBy(asc(schema.proposals.createdAt));

  const [original, generated] = await Promise.all([
    signUrls("originals", all.map((r) => r.p.originalImagePath)),
    signUrls("generated", all.map((r) => r.p.generatedImagePath)),
  ]);
  const items: ModerationItem[] = all.map(({ p, author }) => ({
    type: "proposal",
    id: p.id,
    title: p.title,
    body: `${p.description}\n\nPrompt: ${p.prompt}`.trim(),
    imageUrls: [original.get(p.originalImagePath), generated.get(p.generatedImagePath)].filter((u): u is string => !!u),
    authorName: author,
    reportCount: reportsById.get(p.id) ?? 0,
    aiFlags: p.aiFlags,
    createdAt: p.createdAt.toISOString(),
  }));
  // Most-reported first, then oldest first.
  items.sort((a, b) => b.reportCount - a.reportCount);
  return ok<ModerationQueueResponse>({ items });
});
