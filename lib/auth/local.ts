import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/lib/db";

/** Local mode only: the cookie holds the user id. Never used when Supabase is configured. */
export const DEV_COOKIE = "hs_dev_uid";

/**
 * Local sign-in has no email verification, so staff access must not be guessable once the app is public.
 * If LOCAL_STAFF_EMAILS (comma-separated) is set, only those emails become staff. Otherwise, for purely
 * local development, "staff@…" / "admin@…" emails get those roles.
 */
function roleFor(email: string): "resident" | "staff" | "admin" {
  const allow = process.env.LOCAL_STAFF_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allow) return allow.includes(email) ? "staff" : "resident";
  return email.startsWith("admin@") ? "admin" : email.startsWith("staff@") ? "staff" : "resident";
}

export async function localSignIn(email: string) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, normalized));
  if (user && user.role !== roleFor(normalized)) {
    // Re-apply the role rule on every sign-in so changing LOCAL_STAFF_EMAILS takes effect.
    [user] = await db.update(schema.users).set({ role: roleFor(normalized) }).where(eq(schema.users.id, user.id)).returning();
  }
  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({ id: randomUUID(), email: normalized, displayName: normalized.split("@")[0], role: roleFor(normalized) })
      .returning();
  }
  (await cookies()).set(DEV_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return user;
}

export async function localUserId(): Promise<string | null> {
  return (await cookies()).get(DEV_COOKIE)?.value ?? null;
}

export async function localSignOut() {
  (await cookies()).delete(DEV_COOKIE);
}
