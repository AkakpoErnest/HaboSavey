/**
 * Local mode: no Supabase project configured. Auth uses a dev cookie, storage uses the local
 * filesystem (.data/storage) and the image editor falls back to a demo filter unless a provider key is set.
 * Off in production builds unless LOCAL_MODE=1 (temporary self-hosting from one machine, e.g. via a tunnel).
 */
export const isLocalMode = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NODE_ENV !== "production" || process.env.LOCAL_MODE === "1");

/** Public base URL of the app: APP_URL, else Netlify's URL / DEPLOY_PRIME_URL, else localhost. QR codes encode it. */
export const appUrl = () => process.env.APP_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:3000";

/** Postgres connection string: DATABASE_URL, or the one Netlify Database injects (NETLIFY_DB_URL). */
export const databaseUrl = () => process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL;
