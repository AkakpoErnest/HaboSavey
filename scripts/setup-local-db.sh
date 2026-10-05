#!/usr/bin/env bash
# Local development database (no Supabase needed). Usage: bash scripts/setup-local-db.sh [--reset]
set -euo pipefail
cd "$(dirname "$0")/.."
DB_NAME="${DB_NAME:-habosavey}"
export DATABASE_URL="${DATABASE_URL:-postgres://localhost:5432/$DB_NAME}"

if [[ "${1:-}" == "--reset" ]]; then dropdb --if-exists "$DB_NAME"; fi
createdb "$DB_NAME" 2>/dev/null || true

npx drizzle-kit migrate
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/triggers.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
node scripts/seed-images.mjs
echo "✅ Local DB ready: $DATABASE_URL"
echo "   Sign in with any email. staff@… / admin@… emails get staff/admin roles."
