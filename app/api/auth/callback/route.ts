import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Relative redirect so the browser stays on the host it used (behind proxies/tunnels req.url may be internal). */
const redirectTo = (path: string) => new Response(null, { status: 307, headers: { location: path, "cache-control": "no-store" } });

/** Magic-link landing: exchanges the code for a session cookie, then redirects to `next`. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = /^\/(?!\/)/.test(nextParam) ? nextParam : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(next);
  }
  return redirectTo(`${next}${next.includes("?") ? "&" : "?"}auth_error=1`);
}
