import { and, count, eq, inArray } from "drizzle-orm";
import { HttpError } from "@/lib/api/http";
import { presentChallenge } from "@/lib/api/present";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

type ChallengeRow = typeof schema.challenges.$inferSelect;

export async function loadChallengeRow(id: string): Promise<ChallengeRow> {
  const [row] = await getDb().select().from(schema.challenges).where(eq(schema.challenges.id, id));
  if (!row) throw new HttpError("not_found", "Challenge not found");
  return row;
}

/** Turns challenge rows into API objects: joins places, approved-proposal counts and cover URLs. */
export async function presentChallenges(rows: ChallengeRow[]) {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const placeIds = rows.map((r) => r.placeId).filter((x): x is string => !!x);
  const [places, counts, covers] = await Promise.all([
    placeIds.length ? db.select().from(schema.places).where(inArray(schema.places.id, placeIds)) : [],
    db
      .select({ challengeId: schema.proposals.challengeId, n: count() })
      .from(schema.proposals)
      .where(and(inArray(schema.proposals.challengeId, ids), eq(schema.proposals.status, "approved")))
      .groupBy(schema.proposals.challengeId),
    // Cover images are uploaded by staff into the "generated" bucket under "covers/".
    signUrls("generated", rows.map((r) => r.coverImagePath)),
  ]);
  const placeById = new Map(places.map((p) => [p.id, p]));
  const countById = new Map(counts.map((c) => [c.challengeId, c.n]));
  return rows.map((r) =>
    presentChallenge(
      r,
      r.placeId ? placeById.get(r.placeId) ?? null : null,
      countById.get(r.id) ?? 0,
      r.coverImagePath ? covers.get(r.coverImagePath) ?? null : null,
    ),
  );
}
