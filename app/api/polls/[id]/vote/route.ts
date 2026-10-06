import { and, count, eq, inArray } from "drizzle-orm";
import { PollVoteInput, type PollVoteResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { effectivePollStatus, loadPollRow, MAX_VOTES_PER_IP, resultsVisibleFor, tallyPoll, voterIdentity } from "@/lib/api/polls";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { awardPoints } from "@/lib/points";

/** Cast or change my A/B vote. No account needed unless the poll requires it. */
export const PUT = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const { choice, via } = await parseJson(req, PollVoteInput);
  const user = await getCurrentUser();
  const poll = await loadPollRow(id);

  const status = effectivePollStatus(poll);
  if (status !== "open") throw new HttpError("conflict", status === "closed" ? "This poll has closed" : "This poll is not open yet");
  if ((poll.requireSignIn || poll.verifiedOnly) && !user) throw new HttpError("unauthorized", "Please sign in to vote");
  if (poll.verifiedOnly && !user?.verifiedLocal) throw new HttpError("forbidden", "Only verified Kesennuma residents can vote");

  const { keys, primaryKey, ipHash } = await voterIdentity(user, true);
  if (!primaryKey) throw new HttpError("bad_request", "Please enable cookies to vote");

  const db = getDb();
  const qrCodeId = via
    ? (
        await db
          .select({ id: schema.qrCodes.id })
          .from(schema.qrCodes)
          .where(and(eq(schema.qrCodes.code, via.toLowerCase()), eq(schema.qrCodes.targetType, "poll"), eq(schema.qrCodes.targetId, id)))
      )[0]?.id ?? null
    : null;

  const [existing] = await db
    .select({ id: schema.pollVotes.id })
    .from(schema.pollVotes)
    .where(and(eq(schema.pollVotes.pollId, id), inArray(schema.pollVotes.voterKey, keys)));

  if (existing) {
    await db
      .update(schema.pollVotes)
      .set({ choice, updatedAt: new Date(), ...(user ? { userId: user.id } : {}) })
      .where(eq(schema.pollVotes.id, existing.id));
  } else {
    if (ipHash) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(schema.pollVotes)
        .where(and(eq(schema.pollVotes.pollId, id), eq(schema.pollVotes.ipHash, ipHash)));
      if (n >= MAX_VOTES_PER_IP) throw new HttpError("rate_limited", "Too many votes from this network");
    }
    await db
      .insert(schema.pollVotes)
      .values({ pollId: id, choice, voterKey: primaryKey, userId: user?.id ?? null, ipHash, qrCodeId })
      .onConflictDoUpdate({
        target: [schema.pollVotes.pollId, schema.pollVotes.voterKey],
        set: { choice, updatedAt: new Date() },
      });
  }
  // Points reward taking part (once per poll), not the choice. Changing a vote can't earn again.
  const pointsAwarded = await awardPoints(user, "poll_vote", id);
  return ok<PollVoteResponse>({
    myChoice: choice,
    results: resultsVisibleFor(poll, isStaff(user), true) ? await tallyPoll(id) : null,
    pointsAwarded,
  });
});
