# Citizen Sentiment

Japanese-first civic participation app for Kesennuma. Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn-compatible components and next-intl.

## Description

Citizen Sentiment is a simple app that enables Kesennuma city officials to gather the preferences of citizens about a future project. It’s primarily visual where images, in A/B format, are distributed in multiple media, including web, app, and paper. Each distribution includes a QR code link. Citizens can scan the QR code and land on a page in the Citizen Sentiment app. They make a choice between image A and B and submit their preference. The city can then gauge the sentiment of the populace when making design decisions. 

## Development

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`. Open http://localhost:3000 (redirects to Japanese); English is at `/en`.

`npm run typecheck`, `npm run lint`, and `npm run build` validate the app.

### What works today

- **A/B polls (core):** staff upload image A vs B → a QR code is generated (PNG/SVG/print) → citizens scan, compare and vote with no sign-up
  (one vote per device, changeable while open) → staff see results by channel (which QR/poster/newsletter) and by day, plus CSV.
  Pages: `/ja/polls`, `/ja/p/<id>`, `/q/<code>`, staff: `/ja/admin/polls`.
- **AI option B:** staff upload a real photo as A, and the image AI renders the proposal as B from an editable brief (default: the
  wooden Japanese promenade prompt, `components/admin/poll-prompt.ts`). Generated images are labelled "AI image".
  Set `IMAGE_EDIT_PROVIDER=openai` + `OPENAI_API_KEY` (or `gemini` + `GEMINI_API_KEY`) for real renders; without a key, local mode returns demo images.
- Photo challenges (AI "make it better"), surveys, resident-verification QR codes and moderation are implemented in the API (`app/api`).

### Run locally without any keys

`bash scripts/setup-local-db.sh` (needs local Postgres), then `npm run dev`. With the Supabase URL left blank the app runs in
**local mode**: sign in with any email (`staff@…` gets staff access), photos are stored in `.data/`, AI images are demos.
Try `/q/naiwanab` (demo poll QR) and `/ja/admin/polls`.

### Going live

Create a Supabase project (Tokyo), fill `.env.local` from `.env.example`, run `npm run db:migrate`, then
`supabase/triggers.sql`, `rls.sql`, `storage.sql` (and `seed.sql` for demo data). Set `APP_URL` to the public URL: printed QR codes encode it.
Never commit credentials.

See ARCHITECTURE.md for the design and API contract, and CONVERSATION.md / HANDOFF.md for coordination between Claude and GPT.
