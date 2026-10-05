# HaboSavey — Architecture

> Civic participation web app for **Kesennuma City (気仙沼市), Miyagi, Japan**.
> Residents (1) answer city surveys and (2) photograph a real place — the harbour, a street, a park —
> use AI to imagine it *improved*, and the town **votes** on which vision is best.

Repo: https://github.com/AkakpoErnest/HaboSavey
Built by two agents in parallel: **Claude** and **GPT/Codex**. See `HANDOFF.md` and `CONVERSATION.md`.

---

## 1. Product in one picture

```
 Resident (phone browser)                         City staff (desktop)
 ────────────────────────                         ────────────────────
 📷 Snap a place  ──► ✨ "Make it better"          🗂  Create surveys / photo challenges
        │              (AI edits photo from        📊 See results, export CSV
        │               resident's prompt)         🛡  Moderate submissions
        ▼                                          🏆 Close a challenge, announce winner
 📝 Submit proposal  ──►  🗳  Town votes  ──►  🏆 Winning vision shown on map
 📋 Answer surveys
```

### Core concepts

| Concept | What it is |
|---|---|
| **Place** | A real location (lat/lng + name), e.g. "Kesennuma Fish Market pier". |
| **Challenge** | A question for the town, tied to a place or area: *"How should the Uchiwan waterfront look in 2030?"* Has open/voting/closed dates. Created by city staff (or residents, if approved). |
| **Proposal** | A resident's entry: the **original photo** + **AI-improved image** + title + description. Belongs to a challenge. |
| **Vote** | One resident → one vote per challenge (they can move it until voting closes). |
| **Survey** | A classic questionnaire (single/multi choice, 1–5 rating, free text, photo upload). |
| **Resident** | A signed-in user. Can be marked *verified local* (see §6). |

### Main user flows

1. **Make it better**
   Take/upload photo → pick or confirm location on map → type what to change
   ("add trees, benches, a covered market, keep the boats") or tap preset chips
   (🌳 greenery, 🪑 seating, 💡 lighting, ♿ accessibility, 🌊 tsunami-safe, 🏮 festival) →
   AI generates 2–4 variations → resident picks one, can refine → submit as proposal.
2. **Vote**
   Browse challenge → swipe/scroll proposals as **before/after slider** cards → vote.
   Results visible after voting (or after close — configurable per challenge to avoid bandwagoning).
3. **Survey**
   Open survey link (also via QR code posters around town) → answer → done.
4. **City admin**
   Create challenge/survey → moderation queue → live results dashboard → close & publish winner.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | **Next.js 15 (App Router) + TypeScript** | One deployable; server actions + route handlers for API. |
| UI | **Tailwind CSS + shadcn/ui**, mobile-first | Most residents will use phones. |
| i18n | **next-intl**, Japanese (default) + English | Kesennuma is Japanese-first; English for visitors/volunteers. |
| DB | **PostgreSQL via Supabase** | Managed Postgres + Auth + Storage + Row Level Security. |
| ORM | **Drizzle ORM** + drizzle-kit migrations | Typed schema shared by both agents. |
| Auth | **Supabase Auth**: email magic link (MVP). LINE login added in Phase 2. | No passwords; works for everyone. LINE later for one-tap. |
| File storage | **Supabase Storage** buckets: `originals`, `generated`, `survey-uploads` | Signed URLs, private by default. |
| AI image editing | **Provider adapter** (`lib/ai/image-editor.ts`) — default Google Gemini image editing, fallback OpenAI image edits. Chosen by `IMAGE_EDIT_PROVIDER` env | Swap models without touching UI. |
| AI text | Claude (Anthropic SDK) for: prompt polishing (JP⇄EN), proposal summaries, survey free-text clustering | |
| Moderation | AI safety check on uploads + prompts, then human admin queue | Public civic platform. |
| Maps | **Leaflet + OpenStreetMap** tiles (react-leaflet) | Free, no key. Optional GSI (国土地理院) tiles. |
| Jobs | Next.js route handler + Supabase `generation_jobs` table polled by client (MVP). Later: queue (Inngest/QStash). | AI generation takes 5–30 s. |
| Validation | **Zod** schemas in `lib/schemas/` used by both API and forms | Single source of truth for API contract. |
| Testing | Vitest (unit), Playwright (e2e on key flows) | |
| Hosting | **Vercel** (app) + **Supabase** (Tokyo region `ap-northeast-1`) | Data stays in Japan. |

---

## 3. System diagram

```
┌──────────────────────────── Browser (mobile-first PWA) ────────────────────────────┐
│  /[locale]/...   pages (React Server Components + client islands)                 │
│  Camera capture · Map picker · Before/after slider · Vote button · Survey form    │
└───────────────┬──────────────────────────────────────────────────────────────────┘
                │ fetch / server actions (JSON, Zod-validated)
┌───────────────▼──────────────────── Next.js on Vercel ────────────────────────────┐
│ app/api/*  route handlers                                                          │
│   ├─ challenges, proposals, votes, surveys, responses, places, admin/*             │
│   ├─ uploads  → signed upload URL → Supabase Storage (originals)                   │
│   └─ generate → creates generation_job → calls lib/ai/image-editor                 │
│ lib/                                                                               │
│   ├─ db/ (Drizzle schema + queries)   ├─ ai/ (image-editor, prompt, moderation)    │
│   ├─ auth/ (Supabase session helpers) ├─ schemas/ (Zod = API contract)            │
│   └─ privacy/ (EXIF strip, face/plate blur)                                        │
└──────┬───────────────────────────┬───────────────────────────────┬────────────────┘
       │                           │                               │
┌──────▼───────┐        ┌──────────▼──────────┐        ┌───────────▼───────────┐
│ Supabase     │        │ Supabase Storage    │        │ AI providers          │
│ Postgres+RLS │        │ originals/generated │        │ Gemini / OpenAI image │
│ Auth (email) │        │ survey-uploads      │        │ Claude (text)         │
└──────────────┘        └─────────────────────┘        └───────────────────────┘
```

---

## 4. Data model (Postgres / Drizzle)

```
users            id (=supabase auth uid), display_name, locale, role ['resident'|'staff'|'admin'],
                 verified_local bool, postal_code, created_at
places           id, name_ja, name_en, lat, lng, district, created_by, created_at
challenges       id, place_id?, title_ja, title_en, description_ja, description_en,
                 cover_image_path, status ['draft'|'open'|'voting'|'closed'],
                 submit_opens_at, voting_opens_at, closes_at,
                 results_visibility ['always'|'after_vote'|'after_close'],
                 verified_only_voting bool, winner_proposal_id?, created_by, created_at
proposals        id, challenge_id, author_id, title, description, prompt,
                 original_image_path, generated_image_path, lat, lng,
                 status ['pending'|'approved'|'rejected'|'hidden'], vote_count (cached),
                 created_at
generation_jobs  id, user_id, original_image_path, prompt, presets text[],
                 status ['queued'|'running'|'done'|'failed'], result_paths text[],
                 provider, error, created_at, finished_at
votes            id, challenge_id, proposal_id, user_id, created_at
                 UNIQUE(challenge_id, user_id)          ← one vote per person per challenge
comments         id, proposal_id, user_id, body, status, created_at          (phase 2)
surveys          id, title_ja, title_en, description_*, status ['draft'|'open'|'closed'],
                 opens_at, closes_at, anonymous bool, verified_only bool, created_by
survey_questions id, survey_id, position, type ['single'|'multi'|'rating'|'text'|'photo'|'location'],
                 label_ja, label_en, options jsonb, required bool
survey_responses id, survey_id, user_id?, submitted_at
                 UNIQUE(survey_id, user_id) when not anonymous
survey_answers   id, response_id, question_id, value jsonb
qr_codes         id, code UNIQUE, kind ['verify_local'|'link'], target_type ['survey'|'challenge'|'place']?, target_id?,
                 label, max_uses?, use_count, scan_count, expires_at?, active, created_by, created_at
qr_redemptions   id, qr_id, user_id, created_at   UNIQUE(qr_id, user_id)
reports          id, target_type ['proposal'|'comment'], target_id, reporter_id, reason, status
audit_log        id, actor_id, action, target_type, target_id, meta jsonb, created_at
```

Row Level Security: residents read approved content + their own rows; write only their own
proposals/votes/responses; `staff`/`admin` roles get moderation + survey management.

---

## 5. API contract (route handlers under `app/api`)

All bodies/responses validated with Zod schemas exported from `lib/schemas/*`.
Errors: `{ error: { code: string, message: string } }`. Auth via Supabase session cookie.

Challenge phases are date-driven: `submitOpensAt` → **open** (submit + vote) → `votingOpensAt` → **voting** (vote only)
→ `closesAt` → **closed**. Staff can force `draft`/`closed`. New proposals start `pending` until a moderator approves.

```
POST   /api/auth/magic-link                      { email, locale, next } → emails one-tap sign-in link
GET    /api/auth/callback                        magic-link landing → sets session cookie → redirect `next`
POST   /api/auth/signout

GET    /api/challenges?status=open|voting|closed
GET    /api/challenges/:id                       → challenge + approved proposals (+ counts per visibility rule)
POST   /api/challenges                (staff)
PATCH  /api/challenges/:id            (staff)    → status transitions, winner

POST   /api/uploads                              → { uploadUrl, path }  (signed URL to `originals`)
POST   /api/generate                             { originalPath, prompt, presets[] } → { jobId }
GET    /api/generate/:jobId                      → { status, results: [signedUrl...] }

POST   /api/proposals                            { challengeId, title, description, prompt,
                                                   originalPath, generatedPath, lat, lng }
GET    /api/proposals/:id
POST   /api/proposals/:id/report

PUT    /api/challenges/:id/vote                  { proposalId }   (upsert; moves vote)
DELETE /api/challenges/:id/vote

GET    /api/surveys?status=open
GET    /api/surveys/:id                          → survey + questions
POST   /api/surveys                   (staff)
POST   /api/surveys/:id/responses                { answers: [{questionId, value}] }
GET    /api/surveys/:id/results       (staff)    → aggregates; ?format=csv

GET    /api/qr/:code                             → { kind, label, target, usable }   (public; counts scans)
POST   /api/qr/:code/redeem                      verify_local code → marks me verifiedLocal
GET    /api/admin/qr  POST /api/admin/qr  PATCH /api/admin/qr/:id   (staff: create/list/deactivate)

GET    /api/places   POST /api/places
GET    /api/admin/moderation          (staff)    PATCH /api/admin/moderation/:type/:id
GET    /api/me                                   PATCH /api/me
```

---

## 6. Key design decisions

**AI "make it better" pipeline** (`lib/ai/image-editor.ts`)
1. Original uploaded → server strips EXIF (keep GPS only if user confirmed location) → resize to ≤ 2048 px.
2. Privacy pass: EXIF/GPS stripped by re-encoding (`lib/privacy/clean-image.ts`, done). Automatic face & licence-plate
   blurring is **Phase 2**; until then moderators reject photos with identifiable people (APPI).
3. Prompt builder: resident's text (JP or EN) + preset chips → translated/polished by Claude into an
   edit instruction that **preserves the real scene** ("keep the same viewpoint, buildings, sea and
   mountains; only change …"). Kesennuma context baked in (fishing port, tsunami resilience, seawall).
4. Moderation check on prompt + output.
5. Generate 2–4 variants via provider adapter → stored in `generated` → job marked `done`.
6. Rate limit: e.g. 10 generations / user / day (env-configurable) to control cost.

**Fair voting**
- One vote per verified account per challenge (DB unique constraint), changeable until close.
- `verified_local`: postal code in Kesennuma range (〒988-xxxx) self-declared at signup, optionally
  confirmed by staff (e.g. QR code handed out at city hall / community events). Challenges can require it.
- Results hidden until you vote or until close (configurable) to reduce bandwagon effect.
- Random proposal ordering per user so early entries aren't favoured.

**Accessibility & audience** — large tap targets, high contrast, Japanese-first copy, furigana-friendly
font sizes; many residents are older. Works without install; optional PWA "Add to home screen".

**Trust** — clearly label every generated image as "AI イメージ / AI concept", always show it next to
the original (before/after slider). Audit log for every admin action.

---

## 6b. QR codes

Printed QR codes encode `${APP_URL}/q/<code>` (phone camera opens it; the app also has an in-app scanner).
- **link**: posters/signs around town → open a survey, a challenge, or the create flow for a place
  ("scan at the harbour → photograph this spot").
- **verify_local**: handed out at city hall or community events → scanning while signed in marks the resident
  as a verified local (needed for `verifiedOnly` surveys / `verifiedOnlyVoting` challenges). Optional max uses + expiry.
Staff create, print (PNG/SVG) and deactivate codes in `/admin/qr`; scan and use counts are tracked.

## 6c. Local mode (no keys needed)

When `NEXT_PUBLIC_SUPABASE_URL` is empty (dev only): local Postgres, sign in with any email instantly
(`staff@…`/`admin@…` get those roles), files in `.data/storage` served by `/api/dev-storage`, and a demo image
editor when no Gemini/OpenAI key is set. Setup: `bash scripts/setup-local-db.sh`. Adding real keys switches it off.

## 7. Folder layout

```
/app/[locale]/                 pages
   (public)/page.tsx           home: open challenges + surveys
   challenges/[id]/            challenge + proposals gallery + vote
   create/                     camera → location → prompt → variants → submit
   surveys/[id]/               survey form
   me/                         my proposals, votes, profile
   admin/                      staff dashboard: challenges, surveys, moderation, results
/app/api/                      route handlers (see §5)
/components/                   ui/ (shadcn), camera/, map/, before-after/, survey/, vote/
/lib/
   db/schema.ts, db/queries/   Drizzle
   schemas/                    Zod (THE API contract — both agents import from here)
   ai/                         image-editor.ts (+ providers/), prompt.ts, moderation.ts
   auth/, privacy/, i18n/
/messages/ja.json, en.json     translations
/drizzle/                      migrations
/supabase/                     storage policies, RLS SQL, seed.sql (Kesennuma places)
/tests/                        vitest + playwright
```

---

## 8. Build phases

| Phase | Scope |
|---|---|
| **0 — Scaffold** | Next.js + Tailwind + shadcn + next-intl (ja/en) + Supabase client + Drizzle schema + `.env.example` + CI (typecheck, lint). |
| **1 — MVP** | Auth (email magic link), photo upload, AI generation with before/after, proposals, voting, challenge pages, simple survey builder + answering, admin moderation, seed data for Kesennuma. |
| **2 — Civic polish** | LINE login, map of all proposals, results dashboard + CSV export, verified-local flow with QR, comments, notifications (LINE), share cards (OGP image of before/after). |
| **3 — Insights** | AI clustering of survey free-text, proposal summaries for city council reports (PDF), multi-round voting (top 5 → final). |

---

## 9. Environment variables (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
IMAGE_EDIT_PROVIDER=gemini        # gemini | openai
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LINE_CHANNEL_ID=                   # Phase 2
LINE_CHANNEL_SECRET=               # Phase 2
GENERATIONS_PER_USER_PER_DAY=10
```
Never commit real values. `.env*` (except `.env.example`) is git-ignored.
