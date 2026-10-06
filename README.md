# Citizen Sentiment

Japanese-first civic participation app for Kesennuma (気仙沼市), Miyagi. Next.js 15, React 19, TypeScript, Tailwind CSS,
Drizzle + Postgres (Supabase), next-intl (ja/en).

## Description

Citizen Sentiment is a simple app that enables Kesennuma city officials to gather the preferences of citizens about a future project. It’s primarily visual where images, in A/B format, are distributed in multiple media, including web, app, and paper. Each distribution includes a QR code link. Citizens can scan the QR code and land on a page in the Citizen Sentiment app. They make a choice between image A and B and submit their preference. The city can then gauge the sentiment of the populace when making design decisions.

## Features

| Area | What it does | Where |
|---|---|---|
| **A/B polls (core)** | Staff upload image A and B; a QR code is generated (PNG/SVG/print). Citizens scan, compare and vote **on one page with no sign-up** (one vote per device, changeable while open). Each poll has a memorable URL; the featured poll is at `/ja/poll` (what demo flyers point to). The list page skips straight to the poll when only one is open. Old `/p/<id>` links redirect. | `/ja/poll`, `/ja/poll/<slug>` (e.g. `/ja/poll/promenade`), `/q/<code>` |
| **Imagine in 5 years** | Snap a place, pick themes and write a wish; AI renders **3 visions** of it in 5 years (costs points, default 10 pt, refunded on failure), then **OpenAI gives feedback** (strengths, practical considerations, questions for the city). "Propose to the town" creates a **draft A/B poll** (today vs the vision) for staff review. Demo images/feedback until switched on. **Live status:** the OpenAI key is stored on Netlify, but the account has no API credits yet, so images stay in demo mode and feedback falls back to labelled demo text. To switch on after adding credits: `netlify env:set IMAGE_EDIT_PROVIDER openai` then `bash scripts/deploy-netlify.sh` (images use `OPENAI_IMAGE_MODEL=gpt-image-2`, feedback `gpt-5-mini`). | `/ja/imagine`, `/api/imagine/*`, `lib/ai/feedback.ts` |
| **Thank-you** | After voting: "ありがとう！はまらいんや！" with Hoya Boya, the points just earned, and a link to the points page. The question is not repeated. | same URL |
| **Live results (presentation)** | Big projector view of the vote count and percentages, refreshing every 3 s, with a QR code to vote. Staff sign-in required. | `/ja/poll/result`, `/ja/poll/<slug>/result` |
| **Results (admin)** | Totals, votes per day, and votes per channel (each poster/newsletter/web QR code), plus CSV export (Excel-ready Japanese). | `/ja/admin/polls/<id>` |
| **AI option B** | Staff upload a real photo as A; an image model renders the proposal as B from an editable brief (default: Kit's wooden promenade prompt). Labelled "AI image". | staff poll form |
| **Staff admin** | Create polls, print QR codes, open/close polls, moderation queue. | `/ja/admin/polls` |
| **Resident verification** | City-hall QR codes mark a resident as verified (needed to earn points, optional for voting). | `/q/<code>` |
| **Points (phase 1)** | Verified residents earn はまらいんやポイント for taking part, never for a choice: vote +10, survey +20, approved proposal +50, on-site QR check-in +5/day. Capped at 100/day (atomic, per-user lock). **Demo mode** `POINTS_OPEN_EARNING=1`: anyone earns. Anonymous voters automatically get a **guest account** with a Kesennuma nickname (e.g. かき#4541), with no email and no sign-up; points live there. A secret **personal link** (share/copy on the points page) opens the same guest account on another phone or for the game. Email sign-in stays optional and merges the guest's points. Easy to farm, so turn it off after demos. Balance chip in the header, history page, and "+N pt" notices after poll votes and QR check-ins. | `/ja/me/points`, `GET /api/points` |
| **Game link** | KesenMemento (3D Kesennuma game) players connect their account and collect place stamps and ship-act badges (+2 / +10 pt, own daily cap). Connections can be listed and revoked from the points page (`/ja/me/points`), with confirmation and clear connection status. | `/ja/connect`, `/api/game/*`, [`integrations/kesenmemento/`](integrations/kesenmemento/INTEGRATION.md) |
| **On-chain (phase 2–3)** | Ethereum-L2 contracts: HamaPoints (non-transferable between wallets, only into approved projects), GameVault, soulbound collectibles. 16 Foundry tests. Not deployed yet. | [`contracts/`](contracts/), [`docs/POINTS-AND-GAME.md`](docs/POINTS-AND-GAME.md) |
| **Hoya Boya** | Kesennuma's official mascot on home, list, thank-you and error screens: official city art, unaltered, always credited, never animated. | `components/mascot.tsx` |
| **Motion** | Living harbour hero, entrances, scroll reveals, vote confetti, growing result bars. Off under reduced motion. | `app/globals.css` |
| **Logo** | Speech bubble (citizens' voice) holding two waves (Kesennuma's sea) with the dusk sun. Used in every header and footer, as the browser-tab icon, the iPhone home-screen icon, the app icons and the share preview. | `public/brand/logo-mark.svg`, `public/brand/logo-lockup.svg`, `components/logo.tsx`, `app/icon.svg`, `app/apple-icon.png` |
| **Cute style** | Rounded Japanese typeface (Zen Maru Gothic via `next/font`), pastel accents (sakura pink, sea blue, cream), soft rounded cards with gentle shadows, wobbly blob A/B badges, bouncy taps, sakura-and-heart confetti, pastel background glows, Hoya Boya on the points page. Motion is off under reduced motion. | `app/globals.css` (cute pass), `app/[locale]/layout.tsx` |
| **Background video** | The homepage opens with a full-width, looping, silent video of the bay at dusk behind the headline and the "Vote on city plans" button (replaced the drawn harbour illustration). Made seamless from Ernest's Gemini clip; 200 KB on phones / 690 KB on desktop; still poster for reduced-motion or data-saver users; paused off-screen. | `public/video/`, `components/backdrop.tsx`, `components/home.tsx` |
| **Artwork** | AI-generated concept art by Codex: a wooden-promenade option B (`naiwan-b-promenade.jpg`, a speculative concept, always labelled "AI image"), a share card and app icons. The polls page banner and homepage vote band play a **looping background video** of the bay at dusk (`public/video/`, made seamless and silent from Ernest's Gemini clip; 200 KB on phones / 690 KB desktop; still poster for reduced-motion or data-saver users; paused off-screen) via `components/backdrop.tsx`. Prompts in `public/images/ASSETS.md`. | `public/images/`, `public/icons/` |
| Also in the API | Photo challenges ("make it better" with AI), surveys, email magic-link sign-in. | `app/api/` |

## Demo script (Kit's presentation)

1. Flyers show the A/B images and a QR code to **`https://<host>/ja/poll`** (print it from `/ja/admin/polls/<poll>`, or any QR generator).
2. The audience scans, picks A or B and submits, fully anonymously. They see "ありがとう！はまらいんや！", **+10 pt** and their
   nickname (with `POINTS_OPEN_EARNING=1`), plus links to their points (personal link for other phones) and to the game.
3. At the end, open **`https://<host>/ja/poll/result`** on the projector, signed in with the staff email, to show the live count.

To feature a different poll at `/ja/poll`, tick "Show this poll at /poll" when creating it (or `PATCH /api/polls/<slug> {featured:true}`).

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

**Netlify (live: https://citizen-sentiment-kesennuma.netlify.app, flyer QR → `/ja/poll`, results → `/ja/poll/result`):** `netlify.toml` is included. The site runs in local mode
with photos in **Netlify Blobs** (`STORAGE_DRIVER=netlify-blobs`) and **Neon** Postgres (project `citizen-sentiment`, US East 2, next to
Netlify's functions) in `DATABASE_URL`;
Netlify's built-in database isn't available on this account. Set up the database once with
`DATABASE_URL='postgres://…' bash scripts/setup-remote-db.sh` (applies `db/migrations/*.sql`, regenerated from drizzle by
`node scripts/sync-migrations.mjs`). Deploy with `bash scripts/deploy-netlify.sh` (clean copy of HEAD, so no `.env.local`; adds sharp's Linux binaries,
because Netlify functions run on Linux even when you build on a Mac). Netlify's "Powered by Netlify" badge sits bottom-right on
the free plan; the sticky vote button lifts itself above it.

**Production:** create a Supabase project (Tokyo region), fill `.env.local` from `.env.example`, run `npm run db:migrate`,
set `VOTER_KEY_SECRET`, `GAME_LINK_SECRET` and `DEV_STORAGE_SECRET` (32+ random chars each; production refuses to sign without them), then `supabase/triggers.sql`, `rls.sql` and `storage.sql` (plus `seed.sql` for demo data), and deploy to Vercel. Set `APP_URL`
to the public URL, because printed QR codes encode it, and set `GAME_ORIGINS` to the game's origin(s). Never commit credentials.

## Who needs an account?

| Who | Account? |
|---|---|
| Citizens voting on an A/B poll | **No.** Scan the QR code, pick A or B (one vote per device). In demo mode they get an automatic **anonymous guest account** (nickname, no email) that holds their points. |
| Playing KesenMemento | **No.** The game works as before for everyone. |
| Collecting stamps in the game | **Connect** from the game, either as a guest (no sign-up) or with email. |
| Earning points | A **verified resident** account (city-hall QR code, or verified later by staff). |
| City staff | A staff account. |
| The game's author | No account with us; the game just includes `cs-connect.js` and tells us its web address. |

## Status and open decisions

- Network: **Ethereum**. Recommended pilot (see [docs/points-chain-options.md](docs/points-chain-options.md)): **Base Sepolia** (an Ethereum L2 testnet) with **Privy** email wallets and app-paid gas, keeping the Postgres ledger as the source of truth. Mainnet is a later decision after measured costs.
- "Hoya Boya points" as a name, and Hoya Boya in the game or collectibles, need **Kesennuma City's approval**; the default name is はまらいんやポイント.
- On-chain points need a legal check (Japan's Payment Services Act) before mainnet.
- Integration with KesenMemento is pending with its author (ss251).

## Agent tooling (Neon)

For AI coding agents working on the database: the **Neon MCP server** is configured project-level in `.mcp.json` (OAuth, so no API key in
the repo; pinned to Neon project `holy-sea-88944719`; the agent asks to sign in on first use), and the Neon agent skills `neon` and
`neon-postgres` are in `.claude/skills/` (versions pinned in `skills-lock.json`; update with `npx neon@latest skills update -y`).

## Working on this repo

Claude and Codex (GPT) build this together via [CONVERSATION.md](CONVERSATION.md) and [HANDOFF.md](HANDOFF.md). Every finished change
is committed and pushed to `main` once `npm run typecheck`, `npm run lint` and `npm run build` pass, with this README updated in the
same push.

## Docs

[ARCHITECTURE.md](ARCHITECTURE.md) (design + API contract) · [docs/POINTS-AND-GAME.md](docs/POINTS-AND-GAME.md) · [docs/points-chain-options.md](docs/points-chain-options.md) · [docs/LAUNCH.md](docs/LAUNCH.md) (public launch plan) · [docs/city-application-hoyaboya.md](docs/city-application-hoyaboya.md) (Hoya Boya approval request, draft) ·
[integrations/kesenmemento/INTEGRATION.md](integrations/kesenmemento/INTEGRATION.md) · coordination between Claude and Codex/GPT:
[CONVERSATION.md](CONVERSATION.md), [HANDOFF.md](HANDOFF.md).

Points-page guidance follows API eligibility for guest/open earning and verified-resident modes. Visitors can enter a poll or sign in; the header offers “View points” when no balance is available.
