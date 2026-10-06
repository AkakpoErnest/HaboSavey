import { z } from "zod";
import { IsoDate } from "./common";

/** Partner games allowed to link accounts. */
export const GameApp = z.enum(["kesenmemento"]);
export type GameApp = z.infer<typeof GameApp>;

/** POST /api/game/link (signed-in session, called by /[locale]/connect). */
export const GameLinkInput = z.object({
  app: GameApp,
  /** Where to send the player back; its origin must be in GAME_ORIGINS. */
  returnUrl: z.string().url(),
  /** Opaque value from the game, echoed back (CSRF protection on the game side). */
  state: z.string().max(200).default(""),
});
export const GameLinkResponse = z.object({
  /** returnUrl + `#cs_token=…&cs_state=…&cs_exp=…` (fragment, so the token never hits server logs). */
  redirectUrl: z.string().url(),
  expiresAt: IsoDate,
});
export type GameLinkResponse = z.infer<typeof GameLinkResponse>;

/** Game → us. Auth: `Authorization: Bearer <token>`. CORS-enabled for the game's origin. */
export const GameEventInput = z.discriminatedUnion("type", [
  /** Player reached a place (the game's tour stop id, e.g. "bay", "market", "pier7"). */
  z.object({ type: z.literal("place_visited"), placeId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,39}$/) }),
  /** Player finished a ship act (1 send-off, 2 longline, 3 the chain home). */
  z.object({ type: z.literal("act_completed"), act: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
]);
export type GameEventInput = z.infer<typeof GameEventInput>;

export const GameEventResponse = z.object({
  /** True the first time (a new stamp/badge); false if already collected. */
  newStamp: z.boolean(),
  /** Points awarded now (verified residents only, within the game's daily cap). */
  pointsAwarded: z.number().int(),
});
export type GameEventResponse = z.infer<typeof GameEventResponse>;

/** GET /api/game/me */
export const GameMeResponse = z.object({
  displayName: z.string(),
  verifiedResident: z.boolean(),
  points: z.number().int(),
  pointsName: z.object({ ja: z.string(), en: z.string() }),
  stamps: z.object({ places: z.array(z.string()), acts: z.array(z.number().int()) }),
});
export type GameMeResponse = z.infer<typeof GameMeResponse>;
