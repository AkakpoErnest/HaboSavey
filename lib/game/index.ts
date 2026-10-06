import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { HttpError } from "@/lib/api/http";
import { startOfJstDay } from "@/lib/ai/run-job";
import type { GameApp } from "@/lib/schemas";
import { getDb, schema } from "@/lib/db";

/** Link tokens let a partner game act for a user on /api/game/* only. Signed with HMAC; 30 days. */
const TTL_SECONDS = 60 * 60 * 24 * 30;
const secret = () => process.env.GAME_LINK_SECRET ?? process.env.VOTER_KEY_SECRET ?? "citizen-sentiment-local-game";
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function issueGameToken(userId: string, app: GameApp) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const body = b64(JSON.stringify({ sub: userId, app, exp }));
  return { token: `${body}.${sign(body)}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyGameToken(header: string | null): { userId: string; app: GameApp } {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  const [body, sig] = token?.split(".") ?? [];
  if (!body || !sig) throw new HttpError("unauthorized", "Connect your Citizen Sentiment account first");
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new HttpError("unauthorized", "Invalid link token");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { sub: string; app: GameApp; exp: number };
  if (payload.exp < Date.now() / 1000) throw new HttpError("unauthorized", "Link expired; please connect again");
  return { userId: payload.sub, app: payload.app };
}

/** Allowed browser origins for partner games (comma-separated GAME_ORIGINS; local dev defaults). */
export const gameOrigins = () =>
  (process.env.GAME_ORIGINS ?? "http://127.0.0.1:8787,http://localhost:8787,https://kesennuma-living-city-production.up.railway.app")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !gameOrigins().includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

/** Game rewards: small, once per stamp, with their own daily cap (separate from civic participation). */
export const GAME_RULES = { place_visited: 2, act_completed: 10 } as const;
export const GAME_DAILY_CAP = Number(process.env.GAME_POINTS_DAILY_CAP ?? 30);

export async function gamePointsToday(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`coalesce(sum(${schema.pointsLedger.amount}), 0)::int` })
    .from(schema.pointsLedger)
    .where(
      and(
        eq(schema.pointsLedger.userId, userId),
        eq(schema.pointsLedger.reason, "game_reward"),
        gte(schema.pointsLedger.createdAt, startOfJstDay()),
      ),
    );
  return row?.n ?? 0;
}

/** Adds the game's CORS headers to every response, including errors, so the game can read error messages. */
export function withCors<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const res = await handler(req, ctx);
    for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
    return res;
  };
}
