#!/usr/bin/env bash
# Deploys the committed code (HEAD) to Netlify production from a clean copy:
#  - no .env.local / .data are bundled (runtime settings come from the Netlify site env)
#  - sharp's Linux binaries are added, because Netlify functions run on linux-x64 even when building on a Mac
# Usage: bash scripts/deploy-netlify.sh   (needs `netlify login`; site id below)
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_ID="${NETLIFY_SITE_ID:-0f3ae801-e83b-45e1-a410-24e594578577}"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
git archive HEAD | tar -x -C "$DIR"
cd "$DIR"
npm ci --no-audit --no-fund
npm install --no-save --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc sharp
npx -y netlify-cli@latest link --id "$SITE_ID"
npx -y netlify-cli@latest deploy --build --prod
