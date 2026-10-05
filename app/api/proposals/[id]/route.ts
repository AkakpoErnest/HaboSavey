import { ok, route, type Params } from "@/lib/api/http";
import { loadProposal } from "@/lib/api/proposals";
import { getCurrentUser } from "@/lib/auth";

export const GET = route<Params<"id">>(async (_req, { params }) => {
  const { id } = await params;
  return ok({ proposal: await loadProposal(id, await getCurrentUser()) });
});
