import { asc, eq } from "drizzle-orm";
import type { PollResultsResponse } from "@/lib/schemas";
import { ok, route, type Params } from "@/lib/api/http";
import { loadPollRow, presentPolls } from "@/lib/api/polls";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

const jstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** GET /api/polls/:id/results (staff). ?format=csv → one anonymous row per vote. */
export const GET = route<Params<"id">>(async (req, { params }) => {
  const { id: ref } = await params;
  await requireStaff();
  const row = await loadPollRow(ref);
  const id = row.id;
  const votes = await getDb()
    .select({
      choice: schema.pollVotes.choice,
      qrCodeId: schema.pollVotes.qrCodeId,
      qrLabel: schema.qrCodes.label,
      signedIn: schema.pollVotes.userId,
      createdAt: schema.pollVotes.createdAt,
      updatedAt: schema.pollVotes.updatedAt,
    })
    .from(schema.pollVotes)
    .leftJoin(schema.qrCodes, eq(schema.qrCodes.id, schema.pollVotes.qrCodeId))
    .where(eq(schema.pollVotes.pollId, id))
    .orderBy(asc(schema.pollVotes.createdAt));

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = ["voted_at,updated_at,choice,source,signed_in"];
    for (const v of votes) {
      lines.push([v.createdAt.toISOString(), v.updatedAt.toISOString(), v.choice.toUpperCase(), esc(v.qrLabel ?? "Web link"), v.signedIn ? "yes" : "no"].join(","));
    }
    return new Response("﻿" + lines.join("\n"), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="poll-${id}.csv"` },
    });
  }

  const tally = { a: 0, b: 0, total: votes.length };
  const sources = new Map<string, { qrCodeId: string | null; label: string; a: number; b: number }>();
  const days = new Map<string, { day: string; a: number; b: number }>();
  for (const v of votes) {
    tally[v.choice]++;
    const sk = v.qrCodeId ?? "web";
    if (!sources.has(sk)) sources.set(sk, { qrCodeId: v.qrCodeId, label: v.qrLabel ?? "Web link", a: 0, b: 0 });
    sources.get(sk)![v.choice]++;
    const day = jstDay(v.createdAt);
    if (!days.has(day)) days.set(day, { day, a: 0, b: 0 });
    days.get(day)![v.choice]++;
  }
  const [poll] = await presentPolls([row]);
  return ok<PollResultsResponse>({
    poll,
    tally,
    bySource: [...sources.values()].sort((x, y) => y.a + y.b - (x.a + x.b)),
    byDay: [...days.values()],
    signedInShare: votes.length ? votes.filter((v) => v.signedIn).length / votes.length : 0,
  });
});
