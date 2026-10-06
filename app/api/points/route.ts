import { desc, eq } from "drizzle-orm";
import type { PointsResponse } from "@/lib/schemas";
import { ok, route } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { voterIdentity } from "@/lib/api/polls";
import { canEarn, claimGuestPoints, recentlyClaimed, DAILY_CAP, EARN_RULES, earnedToday, pointsBalance } from "@/lib/points";

export const GET = route(async () => {
  const user = await requireUser();
  // Points earned on this device before signing in (demo/open earning) move into the account now.
  const deviceKeys = (await voterIdentity(null, false)).keys;
  await claimGuestPoints(user.id, deviceKeys);
  const claimed = await recentlyClaimed(user.id, deviceKeys);
  const [balance, todayEarned, history] = await Promise.all([
    pointsBalance(user.id),
    earnedToday(user.id),
    getDb()
      .select()
      .from(schema.pointsLedger)
      .where(eq(schema.pointsLedger.userId, user.id))
      .orderBy(desc(schema.pointsLedger.createdAt))
      .limit(100),
  ]);
  return ok<PointsResponse>({
    claimedGuestPoints: claimed,
    balance,
    eligible: canEarn(user),
    todayEarned,
    dailyCap: DAILY_CAP,
    rules: EARN_RULES,
    history: history.map((h) => ({ amount: h.amount, reason: h.reason, refId: h.refId, createdAt: h.createdAt.toISOString(), onchain: !!h.onchainTx })),
  });
});
