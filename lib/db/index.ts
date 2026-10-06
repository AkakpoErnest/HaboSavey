import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getConnectionString } from "@netlify/database";
import { databaseUrl } from "@/lib/env";

type Db = PostgresJsDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { db?: Db };

/** Server-only Drizzle client. Bypasses RLS, so API routes must do their own auth checks. */
export function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;
  let url = databaseUrl();
  if (!url) {
    // On Netlify the connection string may only be exposed through the Netlify runtime env.
    try {
      url = getConnectionString();
    } catch {
      /* not on Netlify */
    }
  }
  if (!url) throw new Error("DATABASE_URL is not set");
  // `prepare: false` is required for the Supabase transaction pooler (port 6543).
  globalForDb.db = drizzle({ client: postgres(url, { prepare: false, max: 5 }), schema });
  return globalForDb.db;
}

export { schema };
