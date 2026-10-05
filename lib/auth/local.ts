import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/lib/db";

/** Local mode only: the cookie holds the user id. Never used when Supabase is configured. */
export const DEV_COOKIE = "hs_dev_uid";

/** "staff@…" or "admin@…" emails get that role locally, so the admin screens can be tried. */
const roleFor = (email: string) =>
  email.startsWith("admin@") ? ("admin" as const) : email.startsWith("staff@") ? ("staff" as const) : ("resident" as const);

export async function localSignIn(email: string) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, normalized));
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
