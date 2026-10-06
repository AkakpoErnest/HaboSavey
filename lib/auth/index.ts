import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { HttpError } from "@/lib/api/http";
import { isLocalMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { anonUserIdFromCookie } from "./anon";
import { localUserId } from "./local";

export type CurrentUser = typeof schema.users.$inferSelect;

/** The signed-in user's profile row, or null. Creates the row if the signup trigger hasn't run. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await getEmailUser()) ?? (await getAnonUser());
}

/** The guest (anonymous) account this device is signed into, if any. */
export async function getAnonUser(): Promise<CurrentUser | null> {
  const id = await anonUserIdFromCookie();
  if (!id) return null;
  const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, id));
  return row?.anonymous ? row : null;
}

/** The email-signed-in user (Supabase session, or the dev cookie in local mode). */
export async function getEmailUser(): Promise<CurrentUser | null> {
  if (isLocalMode()) {
    const id = await localUserId();
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, id));
    return row ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;

  const db = getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, authUser.id));
  if (row) return row;

  const [created] = await db
    .insert(schema.users)
    .values({ id: authUser.id, email: authUser.email ?? null, displayName: authUser.email?.split("@")[0] ?? "resident" })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(schema.users).where(eq(schema.users.id, authUser.id)))[0] ?? null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError("unauthorized", "Please sign in");
  return user;
}

export const isStaff = (u: Pick<CurrentUser, "role"> | null) => u?.role === "staff" || u?.role === "admin";

export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isStaff(user)) throw new HttpError("forbidden", "Staff only");
  return user;
}
