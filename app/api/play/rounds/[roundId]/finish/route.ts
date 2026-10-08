import { PlayFinishInput, type PlayFinishResponse } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { PLAY, finishRound } from "@/lib/play";
import { pointsBalance } from "@/lib/points";

/** Ends a round once. The server measures the duration; counts are checked for plausibility before any points. */
export const POST = route<Params<"roundId">>(async (req, { params }) => {
  const { roundId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(roundId)) throw new HttpError("not_found", "Round not found");
  const user = await requireUser();
  const { bonitos, distance } = await parseJson(req, PlayFinishInput);
  const result = await finishRound(user, roundId, bonitos, distance);
  if (!result) throw new HttpError("conflict", "This round is already finished or has expired");
  return ok<PlayFinishResponse>({ ...result, dailyCap: PLAY.dailyCap, balance: await pointsBalance(user.id) });
});
