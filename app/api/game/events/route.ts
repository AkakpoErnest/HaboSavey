import { and, count, eq } from "drizzle-orm";
import { GameEventInput, type GameEventResponse } from "@/lib/schemas";
import { HttpError, parseJson, route } from "@/lib/api/http";
import { getDb, schema } from "@/lib/db";
import { corsHeaders, GAME_DAILY_CAP, GAME_RULES, gamePointsToday, verifyGameToken, withCors } from "@/lib/game";
import { canEarn, withUserLock } from "@/lib/points";

export const OPTIONS = (req: Request) => new Response(null, { status: 204, headers: corsHeaders(req) });

/** Max distinct place stamps per user per game (the game has ~51 places; headroom, but blocks id spam). */
const MAX_PLACE_STAMPS = 120;

/**
 * Game events are sent by the browser, so they can be forged. Rewards are therefore small, once per stamp,
 * capped per day, and points go only to verified residents. All accounting runs under a per-user lock.
 */
export const POST = withCors(route(async (req) => {
  const { userId, app } = await verifyGameToken(req.headers.get("authorization"));
  const event = await parseJson(req, GameEventInput);
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new HttpError("unauthorized", "Account not found; please connect again");

  const kind = event.type === "place_visited" ? "place" : "act";
  const key = event.type === "place_visited" ? event.placeId : String(event.act);

  const result: GameEventResponse = await withUserLock(userId, async (tx) => {
    if (kind === "place") {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(schema.gameStamps)
        .where(and(eq(schema.gameStamps.userId, userId), eq(schema.gameStamps.app, app), eq(schema.gameStamps.kind, "place")));
      if (n >= MAX_PLACE_STAMPS) throw new HttpError("rate_limited", "Stamp limit reached");
    }
    const [stamp] = await tx.insert(schema.gameStamps).values({ userId, app, kind, key }).onConflictDoNothing().returning();
    if (!stamp || !canEarn(user)) return { newStamp: !!stamp, pointsAwarded: 0 };
    const amount = Math.min(GAME_RULES[event.type], GAME_DAILY_CAP - (await gamePointsToday(userId, tx)));
    if (amount <= 0) return { newStamp: true, pointsAwarded: 0 };
    await tx.insert(schema.pointsLedger).values({ userId, amount, reason: "game_reward", refId: `${app}:${kind}:${key}` });
    return { newStamp: true, pointsAwarded: amount };
  });
  return Response.json(result);
}));
