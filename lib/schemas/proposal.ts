import { z } from "zod";
import { Id, IsoDate, LatLng } from "./common";

export const ProposalStatus = z.enum(["pending", "approved", "rejected", "hidden"]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

/** Compact form used in galleries (before/after slider card). */
export const ProposalCard = z.object({
  id: Id,
  challengeId: Id,
  title: z.string(),
  authorName: z.string(),
  originalImageUrl: z.string().url(),
  generatedImageUrl: z.string().url(),
  voteCount: z.number().int().nullable(),
  status: ProposalStatus,
  createdAt: IsoDate,
});
export type ProposalCard = z.infer<typeof ProposalCard>;

export const Proposal = ProposalCard.extend({
  description: z.string(),
  prompt: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  isMine: z.boolean(),
});
export type Proposal = z.infer<typeof Proposal>;

/** POST /api/proposals. Paths come from /api/uploads and /api/generate. */
export const CreateProposalInput = z.object({
  challengeId: Id,
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  prompt: z.string().max(1000),
  originalPath: z.string().min(1),
  generatedPath: z.string().min(1),
  location: LatLng.optional(),
});
export type CreateProposalInput = z.infer<typeof CreateProposalInput>;

export const ProposalResponse = z.object({ proposal: Proposal });
export type ProposalResponse = z.infer<typeof ProposalResponse>;

/** POST /api/proposals/:id/report */
export const ReportInput = z.object({
  reason: z.enum(["inappropriate", "personal_info", "spam", "other"]),
  note: z.string().max(500).optional(),
});
export type ReportInput = z.infer<typeof ReportInput>;
