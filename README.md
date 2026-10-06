# Citizen Sentiment

Japanese-first civic participation app for Kesennuma (気仙沼市), Miyagi. Next.js 15, React 19, TypeScript, Tailwind CSS,
Drizzle + Postgres (Supabase), next-intl (ja/en).

## Description

Citizen Sentiment is a simple app that enables Kesennuma city officials to gather the preferences of citizens about a future project. It’s primarily visual where images, in A/B format, are distributed in multiple media, including web, app, and paper. Each distribution includes a QR code link. Citizens can scan the QR code and land on a page in the Citizen Sentiment app. They make a choice between image A and B and submit their preference. The city can then gauge the sentiment of the populace when making design decisions.

## Features

| Area | What it does | Where |
|---|---|---|
| **A/B polls (core)** | Staff upload image A and B; a QR code is generated (PNG/SVG/print). Citizens scan, compare and vote **with no sign-up** (one vote per device, changeable while open). | `/ja/polls`, `/ja/p/<id>`, `/q/<code>` |
| **Results** | Totals, votes per day, and votes per channel (each poster/newsletter/web QR code), plus CSV export (Excel-ready Japanese). | `/ja/admin/polls/<id>` |
| **AI option B** | Staff upload a real photo as A; an image model renders the proposal as B from an editable brief (default: Kit's wooden promenade prompt). Labelled "AI image". | staff poll form |
| **Staff admin** | Create polls, print QR codes, open/close polls, moderation queue. | `/ja/admin/polls` |
| **Resident verification** | City-hall QR codes mark a resident as verified (needed to earn points, optional for voting). | `/q/<code>` |
| **Points (phase 1)** | Verified residents earn はまらいんやポイント for taking part, never for a choice: vote +10, survey +20, approved proposal +50, on-site QR check-in +5/day. Capped at 100/day. | `GET /api/points` |
| **Game link** | KesenMemento (3D Kesennuma game) players connect their account and collect place stamps and ship-act badges (+2 / +10 pt, own daily cap). Connections can be listed and revoked. | `/ja/connect`, `/api/game/*`, [`integrations/kesenmemento/`](integrations/kesenmemento/INTEGRATION.md) |
| **On-chain (phase 2–3)** | Ethereum-L2 contracts: HamaPoints (non-transferable between wallets, only into approved projects), GameVault, soulbound collectibles. 16 Foundry tests. Not deployed yet. | [`contracts/`](contracts/), [`docs/POINTS-AND-GAME.md`](docs/POINTS-AND-GAME.md) |
| **Hoya Boya** | Kesennuma's official mascot on home, list, thank-you and error screens: official city art, unaltered, always credited, never animated. | `components/mascot.tsx` |
| **Motion** | Living harbour hero, entrances, scroll reveals, vote confetti, growing result bars. Off under reduced motion. | `app/globals.css` |
| Also in the API | Photo challenges ("make it better" with AI), surveys, email magic-link sign-in. | `app/api/` |

## Run locally (no accounts or keys needed)

Requires Node.js 22+ and a local PostgreSQL.

```sh
npm ci
bash scripts/setup-local-db.sh      # creates + migrates + seeds the "habosavey" database
npm run dev                         # http://localhost:3000 → /ja ; English at /en
```

With `NEXT_PUBLIC_SUPABASE_URL` blank the app runs in **local mode**: sign in with any email instantly (`staff@…` gets
staff access unless `LOCAL_STAFF_EMAILS` is set), files go to `.data/storage`, and AI images are demos unless
`GEMINI_API_KEY` / `OPENAI_API_KEY` is set. Try `/q/naiwanab` (demo poll), `/q/cityhall1` (verify yourself) and `/ja/admin/polls`.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`; contracts: `cd contracts && forge test` (see `contracts/README.md`).

## Hosting

**Temporary, from one Mac:** `npm run build`, `npx next start -p 3000`, and `cloudflared tunnel --url http://localhost:3000`.
In `.env.local` set `APP_URL` to the tunnel address, `LOCAL_MODE=1` and a secret `LOCAL_STAFF_EMAILS`. The address changes
whenever the tunnel restarts (so reprint QR codes), and the Mac must stay awake.

**Production:** create a Supabase project (Tokyo region), fill `.env.local` from `.env.example`, run `npm run db:migrate`,
set `VOTER_KEY_SECRET`, `GAME_LINK_SECRET` and `DEV_STORAGE_SECRET` (32+ random chars each; production refuses to sign without them), then `supabase/triggers.sql`, `rls.sql` and `storage.sql` (plus `seed.sql` for demo data), and deploy to Vercel. Set `APP_URL`
to the public URL, because printed QR codes encode it, and set `GAME_ORIGINS` to the game's origin(s). Never commit credentials.

## Status and open decisions

- Network: **Ethereum**, recommended on an L2 (e.g. Base) because mainnet gas is too costly per vote. Wallet provider is being compared in `docs/points-chain-options.md`.
- "Hoya Boya points" as a name, and Hoya Boya in the game or collectibles, need **Kesennuma City's approval**; the default name is はまらいんやポイント.
- On-chain points need a legal check (Japan's Payment Services Act) before mainnet.
- Integration with KesenMemento is pending with its author (ss251).

## Docs

[ARCHITECTURE.md](ARCHITECTURE.md) (design + API contract) · [docs/POINTS-AND-GAME.md](docs/POINTS-AND-GAME.md) ·
[integrations/kesenmemento/INTEGRATION.md](integrations/kesenmemento/INTEGRATION.md) · coordination between Claude and Codex/GPT:
[CONVERSATION.md](CONVERSATION.md), [HANDOFF.md](HANDOFF.md).
