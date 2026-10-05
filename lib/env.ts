/**
 * Local mode: no Supabase project configured. Auth uses a dev cookie, storage uses the local
 * filesystem (.data/storage) and the image editor falls back to a demo filter unless a provider key is set.
 * Never enabled in production builds.
 */
export const isLocalMode = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== "production";
