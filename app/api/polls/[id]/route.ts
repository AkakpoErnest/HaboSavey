import { ownsPath, download, upload } from "@/lib/storage";
import { cleanImage } from "@/lib/privacy/clean-image";
import { and, eq, inArray, ne } from "drizzle-orm";
import { UpdatePollInput, type PollDetailResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { effectivePollStatus, loadPollRow, presentPolls, resultsVisibleFor, tallyPoll, voterIdentity } from "@/lib/api/polls";
import { getCurrentUser, isStaff, requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { canEarn, EARN_RULES, openEarning } from "@/lib/points";

/** GET /api/polls/:ref, where ref is "current", a uuid, or a slug. */
export const GET = route<Params<"id">>(async (_req, { params }) => {
  const { id: ref } = await params;
  const user = await getCurrentUser();
  const staff = isStaff(user);
  const row = await loadPollRow(ref);
  const id = row.id;
  const status = effectivePollStatus(row);
  if (status === "draft" && !staff) throw new HttpError("not_found", "Poll not found");

  const { keys } = await voterIdentity(user, false);
  const db = getDb();
  const [mine] = keys.length
    ? await db
        .select({ choice: schema.pollVotes.choice })
        .from(schema.pollVotes)
        .where(and(eq(schema.pollVotes.pollId, id), inArray(schema.pollVotes.voterKey, keys)))
    : [];
  const myChoice = mine?.choice ?? null;

  const blockedReason =
    status === "closed" ? "closed"
    : status !== "open" ? "not_open"
    : (row.requireSignIn || row.verifiedOnly) && !user ? "sign_in"
    : row.verifiedOnly && !user?.verifiedLocal ? "verify"
    : null;

  // Points for voting (first vote only): signed-in eligible users, or anyone when open earning is on (demo).
  const eligible = canEarn(user) || (!user && openEarning());
  let alreadyAwarded = false;
  if (eligible && user) {
    const [r] = await db.select({ id: schema.pointsLedger.id }).from(schema.pointsLedger)
      .where(and(eq(schema.pointsLedger.userId, user.id), eq(schema.pointsLedger.reason, "poll_vote"), eq(schema.pointsLedger.refId, id)));
    alreadyAwarded = !!r;
  } else if (eligible && keys.length) {
    const [r] = await db.select({ id: schema.guestPoints.id }).from(schema.guestPoints)
      .where(and(inArray(schema.guestPoints.voterKey, keys), eq(schema.guestPoints.reason, "poll_vote"), eq(schema.guestPoints.refId, id)));
    alreadyAwarded = !!r;
  }

  const [poll] = await presentPolls([row]);
  return ok<PollDetailResponse>({
    poll,
    myChoice,
    canVote: blockedReason === null,
    blockedReason,
    results: resultsVisibleFor(row, staff, myChoice !== null) ? await tallyPoll(id) : null,
    votePoints: eligible && !alreadyAwarded && blockedReason === null ? EARN_RULES.poll_vote : 0,
    votePointsGuest: !user && openEarning(),
  });
});

export const PATCH = route<Params<"id">>(async (req, { params }) => {
  const { id: ref } = await params;
  const staff = await requireStaff();
  const input = await parseJson(req, UpdatePollInput);
  const current = await loadPollRow(ref);
  for (const path of [input.optionAImagePath, input.optionBImagePath]) {
    if (!path) continue;
    if (!ownsPath(staff.id, path)) throw new HttpError("forbidden", "Upload replacement images first");
    try {
      const bytes = await cleanImage(await download("poll-images", path));
      await upload("poll-images", path, bytes, "image/jpeg");
    } catch {
      throw new HttpError("bad_request", "Could not read a replacement image. Upload a JPEG, PNG or WebP.");
    }
  }
  const id = current.id;
  const toDate = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));
  const db = getDb();
  const row = await db.transaction(async (tx) => {
    if (input.featured) await tx.update(schema.polls).set({ featured: false }).where(ne(schema.polls.id, id));
    const [r] = await tx
      .update(schema.polls)
      .set({ ...input, opensAt: toDate(input.opensAt), closesAt: toDate(input.closesAt) })
      .where(eq(schema.polls.id, id))
      .returning();
    return r;
  });
  await db.insert(schema.auditLog).values({ actorId: staff.id, action: "poll.update", targetType: "poll", targetId: id, meta: input });
  const [poll] = await presentPolls([row]);
  return ok({ poll });
});
