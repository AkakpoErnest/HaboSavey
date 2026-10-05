# Instructions for GPT / Codex — from Claude

Hi GPT 👋 — this is Claude. Ernest (the project owner) asked me to design HaboSavey and hand you the
instructions below. We'll build it together in this folder. Please read this file fully, then
`ARCHITECTURE.md`, then reply in `CONVERSATION.md`.

## What we're building
A mobile-first web app for **Kesennuma City (気仙沼市), Japan**:
1. **Surveys**: city staff publish surveys and residents answer them.
2. **"Make it better" photo challenges**: a resident photographs a place (harbour, street, park), AI
   generates an *improved* version from the resident's prompt, they submit it as a proposal, and **the
   town votes** on the best one.

The full design is in `ARCHITECTURE.md` (stack, data model, API contract, phases). Treat it as the spec.
If you disagree with something, propose the change in `CONVERSATION.md` before you change the code.

## Who owns what
| Area | Owner | Paths |
|---|---|---|
| **Git: init, commit, push** | **GPT (only you)** | whole repo |
| Project scaffold (Phase 0) | **GPT** | `package.json`, configs, `app/layout`, Tailwind, shadcn, next-intl |
| Frontend pages & components | **GPT** | `app/[locale]/**`, `components/**`, `messages/*.json` |
| Backend: DB, API, AI, auth, privacy | **Claude** | `app/api/**`, `lib/db/**`, `lib/ai/**`, `lib/auth/**`, `lib/privacy/**`, `drizzle/**`, `supabase/**` |
| **API contract (shared)** | Claude writes, both import | `lib/schemas/**` (Zod) |
| Docs | both | `ARCHITECTURE.md`, `HANDOFF.md`, `CONVERSATION.md`, `README.md` |

Don't edit the other agent's paths. If you need a change there, ask in `CONVERSATION.md`.
For the frontend, call the API exactly as in `ARCHITECTURE.md` §5 and use the types from `lib/schemas`.
Until an endpoint exists, mock it with the same Zod types in `lib/mocks/` (that folder is yours).

## Git rules (you own git)
- This folder is currently **not its own repo**. It sits inside a parent repo in the user's home directory,
  so don't commit to that one. First step:
  ```
  cd /Users/pablo/Downloads/Habosavey
  git init -b main
  git remote add origin https://github.com/AkakpoErnest/HaboSavey.git
  ```
- Commit and push to `main` regularly, including Claude's work.
- Before committing, `npm run typecheck` and `npm run lint` must pass. Also check that Claude isn't
  mid-edit: look at `HANDOFF.md` for an active Claude lock, or files changed in the last ~60 s.
- **Never commit secrets**: `.env`, `.env.local`, and service keys. Only `.env.example` goes in.
  Add `node_modules`, `.next`, `.env*` (with `!.env.example`) and `.DS_Store` to `.gitignore`.
- Use clear commit messages, e.g. `feat(frontend): before/after slider on proposal card`.

## How we communicate
- **`CONVERSATION.md`**: chat between us. Append only, newest at the bottom, with the heading
  `## YYYY-MM-DD HH:MM — GPT → Claude`. Post **before** you start a step (what you'll do and which files)
  and **after** it (the result and anything I need to know). Never put secrets here.
- **`HANDOFF.md`**: current status board. Update your section and the lock line when you start or finish work.

## Your first tasks (in order)
1. Reply in `CONVERSATION.md` to confirm you've read this, plus any concerns about the architecture.
2. `git init` + remote (see above). Add `.gitignore`, then commit the existing docs and push.
3. **Phase 0 scaffold**: Next.js 15 (App Router, TypeScript, `src/`-less layout as in ARCHITECTURE §7),
   Tailwind, shadcn/ui, next-intl with `ja` (default) + `en`, ESLint, the `typecheck` and `lint` npm scripts,
   and `.env.example` from ARCHITECTURE §9. Install `@supabase/supabase-js`, `@supabase/ssr`,
   `drizzle-orm`, `drizzle-kit`, `postgres`, `zod`, `react-leaflet`, `leaflet` so that I can start on the backend.
   Post in CONVERSATION.md when the scaffold is pushed, because I'll wait for it before touching `lib/db`.
4. Frontend MVP screens (mobile-first, Japanese-first copy):
   - Home: open challenges + open surveys
   - Challenge page: before/after slider cards, vote button, results-visibility rules
   - **Create flow**: camera/upload → map pin → prompt + preset chips (🌳🪑💡♿🌊🏮) → show 2–4
     AI variants (poll `GET /api/generate/:jobId`) → pick → title/description → submit
   - Survey answering form (all question types in ARCHITECTURE §4)
   - `/me`: my proposals and votes
   - `/admin`: challenge/survey builder, moderation queue, results (staff only)
   - Always label generated images "AI イメージ / AI concept".
5. Accessibility: big tap targets, high contrast, readable font sizes. Many users are older residents.

## What I (Claude) will do in parallel
Drizzle schema + migrations, Supabase RLS + storage policies, Zod schemas in `lib/schemas`, all
`app/api` routes, the AI image-editing provider adapter, the moderation and privacy pipeline (EXIF strip,
face/plate blur), and seed data for real Kesennuma places. I'll post each step in `CONVERSATION.md`.

Welcome aboard. Let's build something good for Kesennuma 🌊
