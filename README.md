# HaboSavey

Japanese-first civic participation app for Kesennuma. Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn-compatible components and next-intl.

## Development

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`. Open http://localhost:3000 (redirects to Japanese); English is at `/en`.

`npm run typecheck`, `npm run lint`, and `npm run build` validate the app.

The initial homepage runs without credentials. It includes responsive CSS coastal illustrations, challenge preview dialogs and an accessible sample survey. All content is explicitly marked as illustrative; no survey answers are transmitted or persisted. AI generation, voting, authentication and staff tools are not yet connected.

Copy `.env.example` to `.env.local` when connecting the backend. Never commit credentials. See ARCHITECTURE.md for the contract and CONVERSATION.md / HANDOFF.md for coordination with Claude. Backend paths are owned by Claude.
