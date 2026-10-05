import { createHmac, randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import type { Poll, PollStatus, PollTally } from "@/lib/schemas";
import { HttpError } from "@/lib/api/http";
import type { CurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

type PollRow = typeof schema.polls.$inferSelect;

export const VOTER_COOKIE = "cs_vid";
const secret = () => process.env.VOTER_KEY_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "citizen-sentiment-local";
const hmac = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");

/** Max votes from one network (IP) per poll: shared Wi-Fi at city hall or schools is expected. */
export const MAX_VOTES_PER_IP = Number(process.env.POLL_MAX_VOTES_PER_IP ?? 50);

export async function loadPollRow(id: string): Promise<PollRow> {
  const [row] = await getDb().select().from(schema.polls).where(eq(schema.polls.id, id));
  if (!row) throw new HttpError("not_found", "Poll not found");
  return row;
}

export function effectivePollStatus(p: PollRow, now = new Date()): PollStatus {
  if (p.status !== "open") return p.status;
  if (p.opensAt && now < p.opensAt) return "draft";
  if (p.closesAt && now >= p.closesAt) return "closed";
  return "open";
}

export async function presentPolls(rows: PollRow[]): Promise<Poll[]> {
  const urls = await signUrls("poll-images", rows.flatMap((r) => [r.optionAImagePath, r.optionBImagePath]));
  return rows.map((p) => ({
    id: p.id,
    titleJa: p.titleJa,
    titleEn: p.titleEn,
    questionJa: p.questionJa,
    questionEn: p.questionEn,
    descriptionJa: p.descriptionJa,
    descriptionEn: p.descriptionEn,
    options: [
      { key: "a", imageUrl: urls.get(p.optionAImagePath) ?? "", labelJa: p.optionALabelJa, labelEn: p.optionALabelEn },
      { key: "b", imageUrl: urls.get(p.optionBImagePath) ?? "", labelJa: p.optionBLabelJa, labelEn: p.optionBLabelEn },
    ],
    status: effectivePollStatus(p),
    opensAt: p.opensAt?.toISOString() ?? null,
    closesAt: p.closesAt?.toISOString() ?? null,
    resultsVisibility: p.resultsVisibility,
    requireSignIn: p.requireSignIn,
    verifiedOnly: p.verifiedOnly,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function tallyPoll(pollId: string): Promise<PollTally> {
  const rows = await getDb()
    .select({ choice: schema.pollVotes.choice, n: count() })
    .from(schema.pollVotes)
    .where(eq(schema.pollVotes.pollId, pollId))
    .groupBy(schema.pollVotes.choice);
  const a = rows.find((r) => r.choice === "a")?.n ?? 0;
  const b = rows.find((r) => r.choice === "b")?.n ?? 0;
  return { a, b, total: a + b };
}

export const resultsVisibleFor = (p: PollRow, staff: boolean, hasVoted: boolean) =>
  staff ||
  p.resultsVisibility === "always" ||
  effectivePollStatus(p) === "closed" ||
  (p.resultsVisibility === "after_vote" && hasVoted);

/**
 * Who is voting. Signed-in users vote as themselves; everyone else gets an anonymous device cookie.
 * `create` sets the cookie if missing (only in route handlers, which may write cookies).
 */
export async function voterIdentity(user: CurrentUser | null, create: boolean) {
  const jar = await cookies();
  let deviceId = jar.get(VOTER_COOKIE)?.value ?? null;
  if (!deviceId && create) {
    deviceId = randomUUID();
    jar.set(VOTER_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  const keys = [user ? `user:${user.id}` : null, deviceId ? `dev:${hmac(deviceId)}` : null].filter((k): k is string => !!k);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return { keys, primaryKey: keys[0] ?? null, ipHash: ip ? hmac(`ip:${ip}`) : null };
}
