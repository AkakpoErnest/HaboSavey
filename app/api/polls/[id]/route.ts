import { and, eq, inArray } from "drizzle-orm";
import { UpdatePollInput, type PollDetailResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { effectivePollStatus, loadPollRow, presentPolls, resultsVisibleFor, tallyPoll, voterIdentity } from "@/lib/api/polls";
import { getCurrentUser, isStaff, requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const GET = route<Params<"id">>(async (_req, { params }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const staff = isStaff(user);
  const row = await loadPollRow(id);
  const status = effectivePollStatus(row);
  if (status === "draft" && !staff) throw new HttpError("not_found", "Poll not found");

  const { keys } = await voterIdentity(user, false);
  const [mine] = keys.length
    ? await getDb()
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
  const [poll] = await presentPolls([row]);
  return ok<PollDetailResponse>({
    poll,
    myChoice,
    canVote: blockedReason === null,
    blockedReason,
    results: resultsVisibleFor(row, staff, myChoice !== null) ? await tallyPoll(id) : null,
  });
});

export const PATCH = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const staff = await requireStaff();
  const input = await parseJson(req, UpdatePollInput);
  await loadPollRow(id);
  const toDate = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));
  const [row] = await getDb()
    .update(schema.polls)
    .set({ ...input, opensAt: toDate(input.opensAt), closesAt: toDate(input.closesAt) })
    .where(eq(schema.polls.id, id))
    .returning();
  await getDb().insert(schema.auditLog).values({ actorId: staff.id, action: "poll.update", targetType: "poll", targetId: id, meta: input });
  const [poll] = await presentPolls([row]);
  return ok({ poll });
});
