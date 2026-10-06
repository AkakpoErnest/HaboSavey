import { desc, eq } from "drizzle-orm";
import { UpdateMeInput, type Me, type MeResponse } from "@/lib/schemas";
import { ok, parseJson, route } from "@/lib/api/http";
import { presentProposalCard } from "@/lib/api/present";
import { getCurrentUser, requireUser, type CurrentUser } from "@/lib/auth";
import { anonLinkToken } from "@/lib/auth/anon";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";
const presentMe = (u: CurrentUser): Me => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  locale: u.locale,
  role: u.role,
  postalCode: u.postalCode,
  verifiedLocal: u.verifiedLocal,
  anonymous: u.anonymous,
  personalLink: u.anonymous ? `${appUrl()}/api/auth/restore?k=${encodeURIComponent(anonLinkToken(u.id))}` : null,
});

export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return ok<MeResponse>({ me: null, myProposals: [], myVotes: {} });

  const db = getDb();
  const [proposals, votes] = await Promise.all([
    db.select().from(schema.proposals).where(eq(schema.proposals.authorId, user.id)).orderBy(desc(schema.proposals.createdAt)),
    db.select().from(schema.votes).where(eq(schema.votes.userId, user.id)),
  ]);
  const [original, generated] = await Promise.all([
    signUrls("originals", proposals.map((p) => p.originalImagePath)),
    signUrls("generated", proposals.map((p) => p.generatedImagePath)),
  ]);
  return ok<MeResponse>({
    me: presentMe(user),
    // Authors always see their own vote counts.
    myProposals: proposals.map((p) => presentProposalCard(p, user.displayName, { original, generated }, true)),
    myVotes: Object.fromEntries(votes.map((v) => [v.challengeId, v.proposalId])),
  });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, UpdateMeInput);
  const postalCode = input.postalCode === undefined ? undefined : input.postalCode?.replace(/^(\d{3})(\d{4})$/, "$1-$2") ?? null;
  const [updated] = await getDb()
    .update(schema.users)
    .set({
      displayName: input.displayName,
      locale: input.locale,
      postalCode,
      // Changing the postal code drops staff verification until re-confirmed.
      ...(postalCode !== undefined && postalCode !== user.postalCode ? { verifiedLocal: false } : {}),
    })
    .where(eq(schema.users.id, user.id))
    .returning();
  return ok({ me: presentMe(updated) });
});
