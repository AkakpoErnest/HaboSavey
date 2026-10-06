import { desc, eq } from "drizzle-orm";
import type { GameLinksResponse } from "@/lib/schemas";
import { ok, route } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { GAME_NAMES } from "@/lib/game";

/** The signed-in user's game connections (for the "Connected games" UI). */
export const GET = route(async () => {
  const user = await requireUser();
  const rows = await getDb().select().from(schema.gameLinks).where(eq(schema.gameLinks.userId, user.id)).orderBy(desc(schema.gameLinks.createdAt));
  return ok<GameLinksResponse>({
    links: rows.map((l) => ({
      id: l.id,
      app: l.app as keyof typeof GAME_NAMES,
      appName: GAME_NAMES[l.app as keyof typeof GAME_NAMES] ?? { ja: l.app, en: l.app },
      createdAt: l.createdAt.toISOString(),
      lastUsedAt: l.lastUsedAt?.toISOString() ?? null,
      revoked: !!l.revokedAt,
    })),
  });
});
