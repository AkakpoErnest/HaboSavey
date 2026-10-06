import { and, eq, isNull } from "drizzle-orm";
import { HttpError, ok, route, type Params } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

/** Disconnects a game: its token stops working immediately. */
export const DELETE = route<Params<"id">>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const [row] = await getDb()
    .update(schema.gameLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.gameLinks.id, id), eq(schema.gameLinks.userId, user.id), isNull(schema.gameLinks.revokedAt)))
    .returning({ id: schema.gameLinks.id });
  if (!row) throw new HttpError("not_found", "Connection not found");
  await getDb().insert(schema.auditLog).values({ actorId: user.id, action: "game.unlink", targetType: "game_link", targetId: id });
  return ok({ revoked: true });
});
