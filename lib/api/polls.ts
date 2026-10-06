import { createHmac, randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import type { Poll, PollStatus, PollTally } from "@/lib/schemas";
import { HttpError } from "@/lib/api/http";
import { requireSecret } from "@/lib/secrets";
import type { CurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

type PollRow = typeof schema.polls.$inferSelect;

export const VOTER_COOKIE = "cs_vid";
const secret = () => requireSecret("VOTER_KEY_SECRET", "citizen-sentiment-local");
const hmac = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");

/** Max votes from one network (IP) per poll: shared Wi-Fi at city hall or schools is expected. */
export const MAX_VOTES_PER_IP = Number(process.env.POLL_MAX_VOTES_PER_IP ?? 50);

/** Slugs: 3–40 chars, lowercase letters/digits/hyphens, not starting/ending with a hyphen. */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
/** Words that are routes under /[locale]/poll/… */
export const RESERVED_SLUGS = new Set(["result", "results", "current", "new", "admin"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}

/**
 * Loads a poll by "current" (the featured open poll, else the newest open one), by uuid, or by slug.
 */
export async function loadPollRow(ref: string): Promise<PollRow> {
  const db = getDb();
  let row: PollRow | undefined;
  if (ref === "current") {
    const open = await db.select().from(schema.polls).where(eq(schema.polls.status, "open")).orderBy(desc(schema.polls.featured), desc(schema.polls.createdAt));
    row = open.find((p) => effectivePollStatus(p) === "open") ?? open[0];
  } else if (UUID_RE.test(ref)) {
    [row] = await db.select().from(schema.polls).where(eq(schema.polls.id, ref));
  } else if (SLUG_RE.test(ref)) {
    [row] = await db.select().from(schema.polls).where(eq(schema.polls.slug, ref));
  }
  if (!row) throw new HttpError("not_found", "Poll not found");
  return row;
}

/** A free slug based on `base` (adds -2, -3… if taken). */
export async function uniqueSlug(base: string): Promise<string> {
  let root = slugify(base);
  if (root.length < 3 || RESERVED_SLUGS.has(root)) root = `poll-${Math.random().toString(36).slice(2, 8)}`;
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? root : `${root.slice(0, 36)}-${i}`;
    const [taken] = await getDb().select({ id: schema.polls.id }).from(schema.polls).where(eq(schema.polls.slug, candidate));
    if (!taken) return candidate;
  }
  return `poll-${Date.now().toString(36)}`;
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
    slug: p.slug ?? p.id,
    featured: p.featured,
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
