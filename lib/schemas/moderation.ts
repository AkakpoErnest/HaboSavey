import { z } from "zod";
import { Id, IsoDate } from "./common";

export const ModerationTargetType = z.enum(["proposal", "comment"]);

/** GET /api/admin/moderation (staff) */
export const ModerationItem = z.object({
  type: ModerationTargetType,
  id: Id,
  title: z.string(),
  body: z.string(),
  imageUrls: z.array(z.string().url()),
  authorName: z.string(),
  reportCount: z.number().int(),
  aiFlags: z.array(z.string()),
  createdAt: IsoDate,
});
export type ModerationItem = z.infer<typeof ModerationItem>;
export const ModerationQueueResponse = z.object({ items: z.array(ModerationItem) });
export type ModerationQueueResponse = z.infer<typeof ModerationQueueResponse>;

/** PATCH /api/admin/moderation/:type/:id */
export const ModerationDecisionInput = z.object({
  decision: z.enum(["approve", "reject", "hide"]),
  note: z.string().max(500).optional(),
});
export type ModerationDecisionInput = z.infer<typeof ModerationDecisionInput>;
