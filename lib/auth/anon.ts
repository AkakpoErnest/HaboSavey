import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/lib/db";
import { requireSecret } from "@/lib/secrets";

/**
 * Guest accounts: no email, no password. A signed httpOnly cookie on the device is the session, and a secret
 * "my link" lets the person open the same account on another device. Anyone holding that link can use the account,
 * which is the trade-off for being fully anonymous.
 */
export const ANON_COOKIE = "cs_anon";
const MAX_AGE = 60 * 60 * 24 * 365 * 2;
const secret = () => requireSecret("ANON_SESSION_SECRET", "citizen-sentiment-local-anon");
const sig = (purpose: "session" | "link", userId: string) => createHmac("sha256", secret()).update(`${purpose}:${userId}`).digest("base64url");

function verify(purpose: "session" | "link", token: string | null | undefined): string | null {
  const [userId, s] = token?.split(".") ?? [];
  if (!userId || !s || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const expected = Buffer.from(sig(purpose, userId));
  const given = Buffer.from(s);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}

/** Kesennuma-flavoured nicknames: "さんま#4821" (ja) / shown as-is in English too. */
const NICK = ["かつお", "さんま", "ふかひれ", "ほたて", "かき", "まぐろ", "わかめ", "うみねこ", "かもめ", "ほや", "めかじき", "たこ", "いか", "うに"];
export const randomNickname = () => `${NICK[randomInt(NICK.length)]}#${String(randomInt(10000)).padStart(4, "0")}`;

export async function anonUserIdFromCookie(): Promise<string | null> {
  return verify("session", (await cookies()).get(ANON_COOKIE)?.value);
}

async function setSession(userId: string) {
  (await cookies()).set(ANON_COOKIE, `${userId}.${sig("session", userId)}`, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE, secure: process.env.NODE_ENV === "production",
  });
}

/** Creates a guest account and signs this device into it. */
export async function createAnonUser() {
  const [user] = await getDb()
    .insert(schema.users)
    .values({ id: randomUUID(), email: null, displayName: randomNickname(), anonymous: true })
    .returning();
  await setSession(user.id);
  return user;
}

/** The personal link token for a guest account (opens it on another device). */
export const anonLinkToken = (userId: string) => `${userId}.${sig("link", userId)}`;

/** Signs this device into the guest account from a personal link. Returns the user id, or null if invalid. */
export async function restoreAnonFromLink(token: string): Promise<string | null> {
  const userId = verify("link", token);
  if (!userId) return null;
  const [user] = await getDb().select({ id: schema.users.id, anonymous: schema.users.anonymous }).from(schema.users).where(eq(schema.users.id, userId));
  if (!user?.anonymous) return null;
  await setSession(userId);
  return userId;
}

export async function clearAnonSession() {
  (await cookies()).delete(ANON_COOKIE);
}
