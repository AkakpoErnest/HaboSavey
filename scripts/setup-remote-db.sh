#!/usr/bin/env bash
# Applies db/migrations/*.sql (in order) to a hosted Postgres, e.g. Neon or Supabase, then uploads the demo images.
# Usage: DATABASE_URL='postgres://…?sslmode=require' bash scripts/setup-remote-db.sh
#   Re-running is safe only on a fresh database (migrations are not tracked here); triggers and seed are idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?set DATABASE_URL to the hosted Postgres connection string}"
for f in $(ls db/migrations/*.sql | sort); do
  echo "→ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "✅ Database ready"
