import { z } from "zod";
import { Id, KesennumaPostalCode, Locale, Role } from "./common";
import { ProposalCard } from "./proposal";

export const Me = z.object({
  id: Id,
  email: z.string().email().nullable(),
  displayName: z.string(),
  locale: Locale,
  role: Role,
  postalCode: z.string().nullable(),
  verifiedLocal: z.boolean(),
});
export type Me = z.infer<typeof Me>;

/** GET /api/me returns `{ me: null }` when signed out. */
export const MeResponse = z.object({
  me: Me.nullable(),
  myProposals: z.array(ProposalCard),
  /** challengeId → proposalId */
  myVotes: z.record(Id, Id),
});
export type MeResponse = z.infer<typeof MeResponse>;

/** PATCH /api/me */
export const UpdateMeInput = z.object({
  displayName: z.string().min(1).max(40).optional(),
  locale: Locale.optional(),
  postalCode: KesennumaPostalCode.nullable().optional(),
});
export type UpdateMeInput = z.infer<typeof UpdateMeInput>;
