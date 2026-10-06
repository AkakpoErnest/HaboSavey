import { desc, eq } from "drizzle-orm";
import type { PointsResponse } from "@/lib/schemas";
import { ok, route } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { DAILY_CAP, EARN_RULES, earnedToday, pointsBalance } from "@/lib/points";

export const GET = route(async () => {
  const user = await requireUser();
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
    balance,
    eligible: user.verifiedLocal,
    todayEarned,
    dailyCap: DAILY_CAP,
    rules: EARN_RULES,
    history: history.map((h) => ({ amount: h.amount, reason: h.reason, refId: h.refId, createdAt: h.createdAt.toISOString(), onchain: !!h.onchainTx })),
  });
});
