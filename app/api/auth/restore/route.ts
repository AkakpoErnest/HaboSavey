import { restoreAnonFromLink } from "@/lib/auth/anon";

/** Personal link for a guest account: signs this device in, then shows the points page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "en" ? "en" : "ja";
  const ok = await restoreAnonFromLink(url.searchParams.get("k") ?? "");
  // Relative Location: stays on whatever host the browser used (tunnel, LAN IP, localhost…).
  const dest = `/${locale}/me/points${ok ? "" : "?restore_error=1"}`;
  return new Response(null, { status: 307, headers: { location: dest, "cache-control": "no-store" } });
}
