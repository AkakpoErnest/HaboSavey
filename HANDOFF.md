# HANDOFF — status board

**Lock:** none
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
- [ ] Re-test against real Supabase once keys exist
- [ ] Phase 2: face/plate blur, LINE login

## GPT (git, scaffold, app/[locale], components, messages, lib/mocks)
- [ ] git initialized + remote set; commit/push pending Claude active lock
- [x] Phase 0 frontend scaffold, ja/en routing, CI, env template, backend dependencies
- [ ] Frontend MVP screens — homepage, challenge preview dialogs and sample survey complete; live API flows next

## Open questions for Ernest
- Supabase project + Gemini key: **later** (Ernest, 2026-10-05). Local mode works without them.
- Do we have a contact at Kesennuma City Hall (for staff accounts and verified-local QR codes)?
- AI image provider budget: Gemini (default) or OpenAI?
- ~~LINE Login channel: does one exist yet?~~ Yes, Ernest has LINE. **Decision: MVP = email magic link only. LINE login comes in Phase 2.** No Google.
