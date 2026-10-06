import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { HttpError } from "@/lib/api/http";
import { startOfJstDay } from "@/lib/ai/run-job";
import { GameApp } from "@/lib/schemas";
import { requireSecret } from "@/lib/secrets";
import { getDb, schema } from "@/lib/db";
import type { Exec } from "@/lib/points";

/** Link tokens let a partner game act for a user on /api/game/* only. HMAC-signed, 30 days, revocable via game_links. */
const TTL_SECONDS = 60 * 60 * 24 * 30;
const secret = () => requireSecret("GAME_LINK_SECRET", "citizen-sentiment-local-game");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

const TokenPayload = z.object({ lid: z.string().uuid(), sub: z.string().uuid(), app: GameApp, exp: z.number().int().positive() });

export const GAME_NAMES: Record<GameApp, { ja: string; en: string }> = {
  kesenmemento: { ja: "ケセンメメント（気仙沼リビングシティ）", en: "KesenMemento (Kesennuma Living City)" },
};

/** Creates a revocable link row and a token bound to it. */
export async function issueGameToken(userId: string, app: GameApp) {
  const [link] = await getDb().insert(schema.gameLinks).values({ userId, app }).returning({ id: schema.gameLinks.id });
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const body = Buffer.from(JSON.stringify({ lid: link.id, sub: userId, app, exp })).toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt: new Date(exp * 1000).toISOString(), linkId: link.id };
}

const unauthorized = (msg = "Invalid link token") => new HttpError("unauthorized", msg);

/** Verifies signature, payload shape, expiry and that the link hasn't been revoked. */
export async function verifyGameToken(header: string | null): Promise<{ userId: string; app: GameApp; linkId: string }> {
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw unauthorized("Connect your Citizen Sentiment account first");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw unauthorized();
  const [body, sig] = parts;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw unauthorized();
  let payload: z.infer<typeof TokenPayload>;
  try {
    payload = TokenPayload.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  } catch {
    throw unauthorized();
  }
  if (!Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) throw unauthorized("Link expired; please connect again");
  const [link] = await getDb()
    .update(schema.gameLinks)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(schema.gameLinks.id, payload.lid), eq(schema.gameLinks.userId, payload.sub), eq(schema.gameLinks.app, payload.app), isNull(schema.gameLinks.revokedAt)))
    .returning({ id: schema.gameLinks.id });
  if (!link) throw unauthorized("This connection was removed; please connect again");
  return { userId: payload.sub, app: payload.app, linkId: payload.lid };
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

export async function gamePointsToday(userId: string, exec: Exec = getDb()): Promise<number> {
  const [row] = await exec
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
