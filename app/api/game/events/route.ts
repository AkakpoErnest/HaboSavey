import { count, eq } from "drizzle-orm";
import { GameEventInput, type GameEventResponse } from "@/lib/schemas";
import { HttpError, parseJson, route } from "@/lib/api/http";
import { getDb, schema } from "@/lib/db";
import { withCors, corsHeaders, GAME_DAILY_CAP, GAME_RULES, gamePointsToday, verifyGameToken } from "@/lib/game";

export const OPTIONS = (req: Request) => new Response(null, { status: 204, headers: corsHeaders(req) });

/** Max distinct place stamps per user (the game has ~51 places; generous headroom, blocks id spam). */
const MAX_PLACE_STAMPS = 120;

/**
 * Game events are sent by the browser, so they can be forged. Rewards are therefore small, once per
 * stamp, capped per day, and points go only to verified residents.
 */
export const POST = withCors(route(async (req) => {
  const { userId, app } = verifyGameToken(req.headers.get("authorization"));
  const event = await parseJson(req, GameEventInput);
  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new HttpError("unauthorized", "Account not found; please connect again");

  const kind = event.type === "place_visited" ? "place" : "act";
  const key = event.type === "place_visited" ? event.placeId : String(event.act);
  if (kind === "place") {
    const [{ n }] = await db.select({ n: count() }).from(schema.gameStamps).where(eq(schema.gameStamps.userId, userId));
    if (n >= MAX_PLACE_STAMPS) throw new HttpError("rate_limited", "Stamp limit reached");
  }

  const result = await db.transaction(async (tx) => {
    const [stamp] = await tx.insert(schema.gameStamps).values({ userId, app, kind, key }).onConflictDoNothing().returning();
    if (!stamp || !user.verifiedLocal) return { newStamp: !!stamp, pointsAwarded: 0 };
    const amount = Math.min(GAME_RULES[event.type], GAME_DAILY_CAP - (await gamePointsToday(userId)));
    if (amount <= 0) return { newStamp: true, pointsAwarded: 0 };
    await tx
      .insert(schema.pointsLedger)
      .values({ userId, amount, reason: "game_reward", refId: `${app}:${kind}:${key}` })
      .onConflictDoNothing();
    return { newStamp: true, pointsAwarded: amount };
  });
  return Response.json(result satisfies GameEventResponse);
}));
