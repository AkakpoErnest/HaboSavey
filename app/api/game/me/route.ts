import { and, eq } from "drizzle-orm";
import type { GameMeResponse } from "@/lib/schemas";
import { HttpError, route } from "@/lib/api/http";
import { getDb, schema } from "@/lib/db";
import { withCors, corsHeaders, verifyGameToken } from "@/lib/game";
import { pointsBalance } from "@/lib/points";

export const OPTIONS = (req: Request) => new Response(null, { status: 204, headers: corsHeaders(req) });

export const GET = withCors(route(async (req) => {
  const { userId, app } = verifyGameToken(req.headers.get("authorization"));
  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new HttpError("unauthorized", "Account not found; please connect again");
  const stamps = await db
    .select({ kind: schema.gameStamps.kind, key: schema.gameStamps.key })
    .from(schema.gameStamps)
    .where(and(eq(schema.gameStamps.userId, userId), eq(schema.gameStamps.app, app)));
  const body: GameMeResponse = {
    displayName: user.displayName,
    verifiedResident: user.verifiedLocal,
    points: await pointsBalance(userId),
    pointsName: { ja: process.env.NEXT_PUBLIC_POINTS_NAME_JA ?? "はまらいんやポイント", en: process.env.NEXT_PUBLIC_POINTS_NAME_EN ?? "Hamarainya Points" },
    stamps: {
      places: stamps.filter((s) => s.kind === "place").map((s) => s.key),
      acts: stamps.filter((s) => s.kind === "act").map((s) => Number(s.key)),
    },
  };
  return Response.json(body);
}));
