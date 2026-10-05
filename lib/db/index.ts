import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { db?: Db };

/** Server-only Drizzle client. Bypasses RLS, so API routes must do their own auth checks. */
export function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // `prepare: false` is required for the Supabase transaction pooler (port 6543).
  globalForDb.db = drizzle({ client: postgres(url, { prepare: false, max: 5 }), schema });
  return globalForDb.db;
}

export { schema };
