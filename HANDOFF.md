# HANDOFF — status board (Citizen Sentiment, formerly HaboSavey)

**Lock:** none (Claude released)
_(Format: `Lock: <agent> — <paths> — since <time>`. Set it before editing shared files, clear it when done.)_

## Claude (backend: app/api, lib/db, lib/ai, lib/auth, lib/privacy, lib/schemas, drizzle, supabase)
- [x] ARCHITECTURE.md, GPT_INSTRUCTIONS.md, HANDOFF.md, CONVERSATION.md
- [x] Zod API contract `lib/schemas/` (typechecked)
- [x] Drizzle schema `lib/db/`, `drizzle.config.ts`
- [x] `supabase/rls.sql`, `storage.sql`, `seed.sql`
- [x] lib/auth, lib/supabase (server/admin/middleware clients), lib/api helpers, lib/storage
- [x] lib/ai: Gemini/OpenAI image-editor adapter, prompt builder, Claude text moderation, job runner (after())
- [x] lib/privacy/clean-image (EXIF strip + resize via sharp)
- [x] All MVP `app/api` routes (typecheck + eslint clean; smoke-tested: compile, return standard error shape)
- [x] **Local mode** (no keys): local Postgres + dev email sign-in + `.data/storage` + demo image editor. `.env.local` created with blanks.
- [x] QR codes: tables, `/api/qr/:code`, `/api/qr/:code/redeem`, `/api/admin/qr`, 3 demo codes in seed
- [x] End-to-end tested locally with curl: sign-in, upload, generate, proposal, moderation, vote, results visibility, survey validation, results + CSV, QR resolve/redeem/max-uses, sign-out
- [x] **Renamed to Citizen Sentiment; A/B polls are the core** (Kit's README, PR #1): backend + screens (vote, list, QR landing,
      sign-in, staff create/results/QR print). Tested in a phone-size browser (puppeteer): scan → vote → results; staff sign-in → create → QR → results.
- [x] Fixed the unreadable button text (global `a{color}` overrode Tailwind v4 utilities → moved into `@layer base`)
- [x] Staff "Generate B from photo A with AI" in the poll form (Kit's rendering brief pre-filled, editable; `rawPrompt` + `sourceBucket: "poll-images"` on /api/generate). Browser-tested in local mode (demo images).
- [x] PR #1 (Kit's README text) merged: `343426a`
- [x] User authorized pushing current code on 2026-10-06; using existing HaboSavey origin/main.
- [x] Animations + official Hoya Boya (rules: unaltered, credited, not animated). Asked GPT for pose opinions + image generation
- [x] Points Phase 1 (off-chain ledger + API) and contracts (Foundry, 16 tests): `e617bbe`; game plan docs/POINTS-AND-GAME.md
- [x] KesenMemento integration kit + /api/game + /connect (`a0ca433`), E2E-tested with a stand-in game
- [x] Kit's demo flow: one-page vote at /ja/poll, slugs (/ja/poll/promenade), thank-you view with points, guest points (POINTS_OPEN_EARNING), live results /ja/poll/result. Browser-tested end to end
- [x] Anonymous guest accounts (Kit): nickname, no email, personal link, guest game connect, email merge. 8-step multi-phone browser test passes
- [x] **LIVE on Netlify**: https://citizen-sentiment-kesennuma.netlify.app (Neon Postgres + Netlify Blobs). Deploy: `bash scripts/deploy-netlify.sh`. Full flow browser-tested live
- [ ] Re-test against real Supabase once keys exist
- [ ] Set APP_URL to the public URL when deployed (QR codes encode it)
- [ ] Phase 2: face/plate blur, LINE login

## GPT (git, scaffold, app/[locale], components, messages, lib/mocks)
- [x] Points balance/history + poll/QR award notices implemented locally; lint/typecheck pass. Browser QA/rebuild and live survey integration pending.
- [x] Motion polish + live-poll preview copy locally complete; typecheck/lint/CSS compilation passed; visual QA/redeployment pending (2026-10-06)
- [x] Claude image handoff: promenade concept, OG background, 512/192 icons, editable SVG and provenance notes; ready for Claude integration (2026-10-06)
- [x] Git initialized and origin/main synchronized; publishing completed GPT frontend changes per user request.
- [x] Phase 0 frontend scaffold, ja/en routing, CI, env template, backend dependencies
- [ ] Frontend MVP screens — homepage, challenge preview dialogs and sample survey complete; live API flows next

## Open questions for Ernest
- Supabase project + Gemini key: **later** (Ernest, 2026-10-05). Local mode works without them.
- Do we have a contact at Kesennuma City Hall (for staff accounts and verified-local QR codes)?
- AI image provider budget: Gemini (default) or OpenAI?
- ~~LINE Login channel: does one exist yet?~~ Yes, Ernest has LINE. **Decision: MVP = email magic link only. LINE login comes in Phase 2.** No Google.
