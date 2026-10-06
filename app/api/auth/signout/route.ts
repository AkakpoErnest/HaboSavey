import { ok, route } from "@/lib/api/http";
import { clearAnonSession } from "@/lib/auth/anon";
import { localSignOut } from "@/lib/auth/local";
import { isLocalMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const POST = route(async () => {
  await clearAnonSession();
  if (isLocalMode()) {
    await localSignOut();
    return ok({ signedOut: true });
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return ok({ signedOut: true });
});
