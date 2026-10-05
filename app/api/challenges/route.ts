import { desc, ne } from "drizzle-orm";
import { CreateChallengeInput, ListChallengesQuery, type ListChallengesResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, parseQuery, route } from "@/lib/api/http";
import { presentChallenges } from "@/lib/api/challenges";
import { getCurrentUser, isStaff, requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const GET = route(async (req) => {
  const { status } = parseQuery(req, ListChallengesQuery);
  const user = await getCurrentUser();
  const db = getDb();
  const rows = await (isStaff(user)
    ? db.select().from(schema.challenges).orderBy(desc(schema.challenges.createdAt))
    : db.select().from(schema.challenges).where(ne(schema.challenges.status, "draft")).orderBy(desc(schema.challenges.createdAt)));
  let challenges = await presentChallenges(rows);
  // Filter on the effective (date-based) status, which is what residents see.
  if (!isStaff(user)) challenges = challenges.filter((c) => c.status !== "draft");
  if (status) challenges = challenges.filter((c) => c.status === status);
  return ok<ListChallengesResponse>({ challenges });
});

export const POST = route(async (req) => {
  const staff = await requireStaff();
  const input = await parseJson(req, CreateChallengeInput);
  const submit = new Date(input.submitOpensAt);
  const voting = new Date(input.votingOpensAt);
  const close = new Date(input.closesAt);
  if (!(submit <= voting && voting < close)) {
    throw new HttpError("bad_request", "Dates must be submitOpensAt ≤ votingOpensAt < closesAt");
  }
  const [row] = await getDb()
    .insert(schema.challenges)
    .values({
      placeId: input.placeId,
      titleJa: input.titleJa,
      titleEn: input.titleEn,
      descriptionJa: input.descriptionJa,
      descriptionEn: input.descriptionEn,
      coverImagePath: input.coverImagePath,
      submitOpensAt: submit,
      votingOpensAt: voting,
      closesAt: close,
      resultsVisibility: input.resultsVisibility,
      verifiedOnlyVoting: input.verifiedOnlyVoting,
      createdBy: staff.id,
    })
    .returning();
  await getDb().insert(schema.auditLog).values({ actorId: staff.id, action: "challenge.create", targetType: "challenge", targetId: row.id });
  const [challenge] = await presentChallenges([row]);
  return ok({ challenge }, { status: 201 });
});
