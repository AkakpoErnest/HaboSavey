import { desc, eq } from "drizzle-orm";
import type { PointsResponse } from "@/lib/schemas";
import { ok, route } from "@/lib/api/http";
import { getAnonUser, requireUser } from "@/lib/auth";
import { clearAnonSession } from "@/lib/auth/anon";
import { getDb, schema } from "@/lib/db";
import { voterIdentity } from "@/lib/api/polls";
import { canEarn, claimGuestPoints, mergeGuestAccount, recentlyClaimed, recentlyMerged, DAILY_CAP, EARN_RULES, earnedToday, pointsBalance } from "@/lib/points";

export const GET = route(async () => {
  const user = await requireUser();
  // Signed in by email on a device that also has a guest account: fold the guest's points into this account.
  if (!user.anonymous) {
    const guest = await getAnonUser();
    if (guest && guest.id !== user.id) {
      await mergeGuestAccount(guest.id, user.id);
      await clearAnonSession();
    }
  }
  // Points earned on this device before signing in (demo/open earning) move into the account now.
  const deviceKeys = (await voterIdentity(null, false)).keys;
  await claimGuestPoints(user.id, deviceKeys);
  const claimed = (await recentlyClaimed(user.id, deviceKeys)) + (await recentlyMerged(user.id));
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
