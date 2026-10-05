import type { schema } from "@/lib/db";
import type { Challenge, ChallengeStatus, Place, ProposalCard, Survey } from "@/lib/schemas";

type PlaceRow = typeof schema.places.$inferSelect;
type ChallengeRow = typeof schema.challenges.$inferSelect;
type ProposalRow = typeof schema.proposals.$inferSelect;
type SurveyRow = typeof schema.surveys.$inferSelect;

const iso = (d: Date) => d.toISOString();
const isoOrNull = (d: Date | null) => (d ? d.toISOString() : null);

export const presentPlace = (p: PlaceRow): Place => ({
  id: p.id,
  nameJa: p.nameJa,
  nameEn: p.nameEn,
  lat: p.lat,
  lng: p.lng,
  district: p.district,
  createdAt: iso(p.createdAt),
});

/**
 * Status residents see. Staff set draft/closed explicitly; otherwise the phase follows the dates:
 * before votingOpensAt → "open" (submit + vote), before closesAt → "voting" (vote only), then "closed".
 */
export function effectiveChallengeStatus(c: ChallengeRow, now = new Date()): ChallengeStatus {
  if (c.status === "draft" || c.status === "closed") return c.status;
  if (now < c.submitOpensAt) return "draft";
  if (now < c.votingOpensAt) return "open";
  if (now < c.closesAt) return "voting";
  return "closed";
}

export const presentChallenge = (
  c: ChallengeRow,
  place: PlaceRow | null,
  proposalCount: number,
  coverImageUrl: string | null,
): Challenge => ({
  id: c.id,
  place: place ? presentPlace(place) : null,
  titleJa: c.titleJa,
  titleEn: c.titleEn,
  descriptionJa: c.descriptionJa,
  descriptionEn: c.descriptionEn,
  coverImageUrl,
  status: effectiveChallengeStatus(c),
  submitOpensAt: iso(c.submitOpensAt),
  votingOpensAt: iso(c.votingOpensAt),
  closesAt: iso(c.closesAt),
  resultsVisibility: c.resultsVisibility,
  verifiedOnlyVoting: c.verifiedOnlyVoting,
  winnerProposalId: c.winnerProposalId,
  proposalCount,
  createdAt: iso(c.createdAt),
});

export const presentProposalCard = (
  p: ProposalRow,
  authorName: string,
  urls: { original: Map<string, string>; generated: Map<string, string> },
  showVotes: boolean,
): ProposalCard => ({
  id: p.id,
  challengeId: p.challengeId,
  title: p.title,
  authorName,
  originalImageUrl: urls.original.get(p.originalImagePath) ?? "",
  generatedImageUrl: urls.generated.get(p.generatedImagePath) ?? "",
  voteCount: showVotes ? p.voteCount : null,
  status: p.status,
  createdAt: iso(p.createdAt),
});

export const presentSurvey = (s: SurveyRow, questionCount: number): Survey => ({
  id: s.id,
  titleJa: s.titleJa,
  titleEn: s.titleEn,
  descriptionJa: s.descriptionJa,
  descriptionEn: s.descriptionEn,
  status: effectiveSurveyStatus(s),
  opensAt: isoOrNull(s.opensAt),
  closesAt: isoOrNull(s.closesAt),
  anonymous: s.anonymous,
  verifiedOnly: s.verifiedOnly,
  questionCount,
  createdAt: iso(s.createdAt),
});

export function effectiveSurveyStatus(s: SurveyRow, now = new Date()): Survey["status"] {
  if (s.status !== "open") return s.status;
  if (s.opensAt && now < s.opensAt) return "draft";
  if (s.closesAt && now >= s.closesAt) return "closed";
  return "open";
}

/** Stable per-user shuffle so early proposals aren't favoured, without reshuffling on every refresh. */
export function stableShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
    return x >>> 0;
  };
  return [...items].sort((a, b) => h(seed + a.id) - h(seed + b.id));
}
