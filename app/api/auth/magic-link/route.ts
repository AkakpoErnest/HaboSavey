import { MagicLinkInput } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { localSignIn } from "@/lib/auth/local";
import { isLocalMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const POST = route(async (req) => {
  const { email, locale, next } = await parseJson(req, MagicLinkInput);
  if (isLocalMode()) {
    // No email in local mode: sign in immediately so the UI can redirect to `next`.
    await localSignIn(email);
    return ok({ sent: true as const, devSignedIn: true });
  }
  const origin = new URL(req.url).origin;
  const callback = new URL("/api/auth/callback", origin);
  callback.searchParams.set("next", next === "/" ? `/${locale}` : next);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    if (error.status === 429) throw new HttpError("rate_limited", "Too many emails. Please wait a minute.");
    throw new HttpError("bad_request", error.message);
  }
  return ok({ sent: true as const });
});
