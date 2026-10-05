import { asc } from "drizzle-orm";
import { CreatePlaceInput } from "@/lib/schemas";
import { ok, parseJson, route } from "@/lib/api/http";
import { presentPlace } from "@/lib/api/present";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const GET = route(async () => {
  const rows = await getDb().select().from(schema.places).orderBy(asc(schema.places.nameJa));
  return ok({ places: rows.map(presentPlace) });
});

export const POST = route(async (req) => {
  const staff = await requireStaff();
  const input = await parseJson(req, CreatePlaceInput);
  const [row] = await getDb()
    .insert(schema.places)
    .values({ ...input, createdBy: staff.id })
    .returning();
  return ok({ place: presentPlace(row) }, { status: 201 });
});
