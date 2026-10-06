// Builds db/migrations: the drizzle migrations followed by the idempotent triggers and the demo seed, as plain SQL files
// applied in order by scripts/setup-remote-db.sh (Neon, Supabase or any Postgres). Run after `npm run db:generate`.
// Names sort lexicographically: 0000_… 0008_…, then 0008_z_triggers / 0008_zz_seed_demo; future drizzle 0009_… sort after.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const out = "db/migrations";
mkdirSync(out, { recursive: true });
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
for (const e of journal.entries) {
  copyFileSync(`drizzle/${e.tag}.sql`, `${out}/${e.tag.replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}.sql`);
}
const last = String(journal.entries.at(-1).idx).padStart(4, "0");
const existing = new Set(readdirSync(out));
// Triggers and seed are written once; later drizzle migrations get higher numbers, so these never need renaming.
if (![...existing].some((f) => f.endsWith("_z_triggers.sql"))) copyFileSync("supabase/triggers.sql", `${out}/${last}_z_triggers.sql`);
if (![...existing].some((f) => f.endsWith("_zz_seed_demo.sql"))) writeFileSync(`${out}/${last}_zz_seed_demo.sql`, readFileSync("supabase/seed.sql", "utf8"));
console.log(readdirSync(out).sort().join("\n"));
