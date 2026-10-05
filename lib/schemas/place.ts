import { z } from "zod";
import { Id, IsoDate, LatLng } from "./common";

export const Place = LatLng.extend({
  id: Id,
  nameJa: z.string(),
  nameEn: z.string().nullable(),
  district: z.string().nullable(),
  createdAt: IsoDate,
});
export type Place = z.infer<typeof Place>;

export const CreatePlaceInput = LatLng.extend({
  nameJa: z.string().min(1).max(120),
  nameEn: z.string().max(120).optional(),
  district: z.string().max(80).optional(),
});
export type CreatePlaceInput = z.infer<typeof CreatePlaceInput>;
