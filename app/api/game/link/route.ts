import { GameLinkInput, type GameLinkResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { gameOrigins, issueGameToken } from "@/lib/game";

/** Called by our /connect page (same-origin, signed-in session) to mint a link token for a partner game. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const { app, returnUrl, state } = await parseJson(req, GameLinkInput);
  const target = new URL(returnUrl);
  if (!gameOrigins().includes(target.origin)) throw new HttpError("forbidden", "This game address is not allowed");
  await getDb().insert(schema.auditLog).values({ actorId: user.id, action: "game.link", targetType: "game", meta: { app } });
  const { token, expiresAt } = await issueGameToken(user.id, app);
  target.hash = new URLSearchParams({ cs_token: token, cs_state: state, cs_exp: expiresAt }).toString();
  return ok<GameLinkResponse>({ redirectUrl: target.toString(), expiresAt });
});
