/**
 * Local mode: no Supabase project configured. Auth uses a dev cookie, storage uses the local
 * filesystem (.data/storage) and the image editor falls back to a demo filter unless a provider key is set.
 * Off in production builds unless LOCAL_MODE=1 (temporary self-hosting from one machine, e.g. via a tunnel).
 */
export const isLocalMode = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NODE_ENV !== "production" || process.env.LOCAL_MODE === "1");
