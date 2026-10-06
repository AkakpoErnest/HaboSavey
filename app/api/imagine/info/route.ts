import type { ImagineInfoResponse } from "@/lib/schemas";
import { ok, route } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth";
import { IMAGINE_COST, pointsBalance } from "@/lib/points";

export const GET = route(async () => {
  const user = await getCurrentUser();
  return ok<ImagineInfoResponse>({
    cost: IMAGINE_COST,
    balance: user ? await pointsBalance(user.id) : 0,
    signedIn: !!user,
    realAi: !!process.env.OPENAI_API_KEY && process.env.IMAGE_EDIT_PROVIDER === "openai",
  });
});
