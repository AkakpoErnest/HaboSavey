import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Magic-link landing: exchanges the code for a session cookie, then redirects to `next`. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = /^\/(?!\/)/.test(nextParam) ? nextParam : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const fail = new URL(next, url.origin);
  fail.searchParams.set("auth_error", "1");
  return NextResponse.redirect(fail);
}
