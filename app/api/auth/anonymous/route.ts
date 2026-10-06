import { ok, route } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth";
import { createAnonUser } from "@/lib/auth/anon";

/** "Continue as guest": creates a guest account (nickname, no email) for this device, or returns the current one. */
export const POST = route(async () => {
  const existing = await getCurrentUser();
  const user = existing ?? (await createAnonUser());
  return ok({ nickname: user.displayName, anonymous: user.anonymous, created: !existing });
});
