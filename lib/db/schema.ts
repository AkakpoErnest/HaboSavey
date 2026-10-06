import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const tsz = (name: string) => timestamp(name, { withTimezone: true });

export const roleEnum = pgEnum("role", ["resident", "staff", "admin"]);
export const localeEnum = pgEnum("locale", ["ja", "en"]);
export const challengeStatusEnum = pgEnum("challenge_status", ["draft", "open", "voting", "closed"]);
export const resultsVisibilityEnum = pgEnum("results_visibility", ["always", "after_vote", "after_close"]);
export const proposalStatusEnum = pgEnum("proposal_status", ["pending", "approved", "rejected", "hidden"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "done", "failed"]);
export const surveyStatusEnum = pgEnum("survey_status", ["draft", "open", "closed"]);
export const questionTypeEnum = pgEnum("question_type", ["single", "multi", "rating", "text", "photo", "location"]);
export const reportTargetEnum = pgEnum("report_target", ["proposal", "comment"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);

/** One row per Supabase auth user (id = auth.users.id; FK + signup trigger live in supabase/rls.sql). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name").notNull(),
  locale: localeEnum("locale").notNull().default("ja"),
  role: roleEnum("role").notNull().default("resident"),
  postalCode: text("postal_code"),
  verifiedLocal: boolean("verified_local").notNull().default(false),
  /** Guest account with no email (created on an anonymous vote or "continue as guest"); signed in via a device cookie. */
  anonymous: boolean("anonymous").notNull().default(false),
  createdAt: createdAt(),
});

export const places = pgTable("places", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameJa: text("name_ja").notNull(),
  nameEn: text("name_en"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  district: text("district"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    titleJa: text("title_ja").notNull(),
    titleEn: text("title_en"),
    descriptionJa: text("description_ja").notNull().default(""),
    descriptionEn: text("description_en"),
    coverImagePath: text("cover_image_path"),
    status: challengeStatusEnum("status").notNull().default("draft"),
    submitOpensAt: tsz("submit_opens_at").notNull(),
    votingOpensAt: tsz("voting_opens_at").notNull(),
    closesAt: tsz("closes_at").notNull(),
    resultsVisibility: resultsVisibilityEnum("results_visibility").notNull().default("after_vote"),
    verifiedOnlyVoting: boolean("verified_only_voting").notNull().default(false),
    // FK to proposals is added in SQL (circular reference).
    winnerProposalId: uuid("winner_proposal_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("challenges_status_idx").on(t.status)],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    prompt: text("prompt").notNull().default(""),
    originalImagePath: text("original_image_path").notNull(),
    generatedImagePath: text("generated_image_path").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    status: proposalStatusEnum("status").notNull().default("pending"),
    aiFlags: text("ai_flags").array().notNull().default(sql`'{}'::text[]`),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("proposals_challenge_idx").on(t.challengeId, t.status),
    index("proposals_author_idx").on(t.authorId),
  ],
);

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    originalImagePath: text("original_image_path").notNull(),
    prompt: text("prompt").notNull().default(""),
    presets: text("presets").array().notNull().default(sql`'{}'::text[]`),
    variants: integer("variants").notNull().default(3),
    /** "originals" for resident photo challenges, "poll-images" for staff A/B polls (results go to the same bucket). */
    sourceBucket: text("source_bucket").notNull().default("originals"),
    /** Staff only: send `prompt` to the image model verbatim instead of the resident prompt builder. */
    rawPrompt: boolean("raw_prompt").notNull().default(false),
    status: jobStatusEnum("status").notNull().default("queued"),
    resultPaths: text("result_paths").array().notNull().default(sql`'{}'::text[]`),
    provider: text("provider"),
    error: text("error"),
    createdAt: createdAt(),
    finishedAt: tsz("finished_at"),
  },
  (t) => [index("generation_jobs_user_day_idx").on(t.userId, t.createdAt)],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  // One vote per person per challenge.
  (t) => [uniqueIndex("votes_one_per_challenge").on(t.challengeId, t.userId), index("votes_proposal_idx").on(t.proposalId)],
);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: proposalStatusEnum("status").notNull().default("approved"),
  createdAt: createdAt(),
});

export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().defaultRandom(),
  titleJa: text("title_ja").notNull(),
  titleEn: text("title_en"),
  descriptionJa: text("description_ja").notNull().default(""),
  descriptionEn: text("description_en"),
  status: surveyStatusEnum("status").notNull().default("draft"),
  opensAt: tsz("opens_at"),
  closesAt: tsz("closes_at"),
  anonymous: boolean("anonymous").notNull().default(false),
  verifiedOnly: boolean("verified_only").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export type QuestionOptionRow = { value: string; labelJa: string; labelEn: string | null };

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    surveyId: uuid("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    type: questionTypeEnum("type").notNull(),
    labelJa: text("label_ja").notNull(),
    labelEn: text("label_en"),
    options: jsonb("options").$type<QuestionOptionRow[]>().notNull().default([]),
    required: boolean("required").notNull().default(true),
  },
  (t) => [index("survey_questions_survey_idx").on(t.surveyId, t.position)],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    surveyId: uuid("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
    // Always set (for one-response-per-person), but never exposed for anonymous surveys.
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    submittedAt: tsz("submitted_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("survey_responses_one_per_user").on(t.surveyId, t.userId)],
);

export const surveyAnswers = pgTable(
  "survey_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id").notNull().references(() => surveyResponses.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => surveyQuestions.id, { onDelete: "cascade" }),
    value: jsonb("value").notNull(),
  },
  (t) => [index("survey_answers_question_idx").on(t.questionId)],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: reportTargetEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  note: text("note"),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: createdAt(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id"),
  meta: jsonb("meta").notNull().default({}),
  createdAt: createdAt(),
});

/**
 * QR codes printed by city staff. Each encodes `${APP_URL}/q/<code>`.
 *  - verify_local: handed out at city hall / events; scanning marks the resident as a verified local.
 *  - link: posters around town that open a survey, a challenge, or the create flow for a place.
 */
export const qrKindEnum = pgEnum("qr_kind", ["verify_local", "link"]);
export const qrTargetEnum = pgEnum("qr_target", ["survey", "challenge", "place", "poll"]);

export const qrCodes = pgTable("qr_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  kind: qrKindEnum("kind").notNull(),
  targetType: qrTargetEnum("target_type"),
  targetId: uuid("target_id"),
  label: text("label").notNull(),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  scanCount: integer("scan_count").notNull().default(0),
  expiresAt: tsz("expires_at"),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const qrRedemptions = pgTable(
  "qr_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    qrId: uuid("qr_id").notNull().references(() => qrCodes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("qr_redemptions_once").on(t.qrId, t.userId)],
);

/**
 * A/B polls (core feature): city staff post image A vs image B with a question; citizens scan a QR
 * code (web, app or paper), pick one and submit, with no account needed by default.
 */
export const pollStatusEnum = pgEnum("poll_status", ["draft", "open", "closed"]);
export const pollChoiceEnum = pgEnum("poll_choice", ["a", "b"]);

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Memorable URL id: /[locale]/poll/<slug>. Unique; lowercase letters, digits, hyphens. */
  slug: text("slug").unique(),
  /** The poll shown at /[locale]/poll (e.g. the one printed on demo flyers). */
  featured: boolean("featured").notNull().default(false),
  titleJa: text("title_ja").notNull(),
  titleEn: text("title_en"),
  questionJa: text("question_ja").notNull(),
  questionEn: text("question_en"),
  descriptionJa: text("description_ja").notNull().default(""),
  descriptionEn: text("description_en"),
  optionAImagePath: text("option_a_image_path").notNull(),
  optionALabelJa: text("option_a_label_ja").notNull(),
  optionALabelEn: text("option_a_label_en"),
  optionBImagePath: text("option_b_image_path").notNull(),
  optionBLabelJa: text("option_b_label_ja").notNull(),
  optionBLabelEn: text("option_b_label_en"),
  placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
  status: pollStatusEnum("status").notNull().default("draft"),
  opensAt: tsz("opens_at"),
  closesAt: tsz("closes_at"),
  resultsVisibility: resultsVisibilityEnum("results_visibility").notNull().default("after_vote"),
  requireSignIn: boolean("require_sign_in").notNull().default(false),
  verifiedOnly: boolean("verified_only").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    choice: pollChoiceEnum("choice").notNull(),
    /** HMAC of the anonymous device cookie (or "user:<id>" when signed in). One vote per key per poll. */
    voterKey: text("voter_key").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** HMAC of the client IP, used only to cap votes per network. */
    ipHash: text("ip_hash"),
    /** Which printed/online QR code the vote came through (null = direct web link). */
    qrCodeId: uuid("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: tsz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("poll_votes_one_per_voter").on(t.pollId, t.voterKey),
    index("poll_votes_ip_idx").on(t.pollId, t.ipHash),
  ],
);

/**
 * Participation points (Phase 1: off-chain ledger). One row per award/spend; the balance is the sum.
 * UNIQUE(user_id, reason, ref_id) makes every award idempotent (e.g. one award per poll per person).
 * `onchain_tx` is filled when the row is mirrored on-chain (Phase 2).
 */
export const pointsReasonEnum = pgEnum("points_reason", [
  "poll_vote",
  "survey_response",
  "proposal_approved",
  "qr_checkin",
  "game_deposit",
  "game_reward",
  "admin_adjust",
]);

export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: pointsReasonEnum("reason").notNull(),
    refId: text("ref_id").notNull(),
    onchainTx: text("onchain_tx"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("points_ledger_once").on(t.userId, t.reason, t.refId),
    index("points_ledger_user_idx").on(t.userId, t.createdAt),
  ],
);

/** Stamps/badges earned in partner games (e.g. KesenMemento): one row per (user, app, kind, key). */
export const gameStamps = pgTable(
  "game_stamps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    app: text("app").notNull(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("game_stamps_once").on(t.userId, t.app, t.kind, t.key)],
);

/** A partner-game connection. Link tokens carry this id; revoking the row invalidates the token immediately. */
export const gameLinks = pgTable(
  "game_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    app: text("app").notNull(),
    createdAt: createdAt(),
    lastUsedAt: tsz("last_used_at"),
    revokedAt: tsz("revoked_at"),
  },
  (t) => [index("game_links_user_idx").on(t.userId)],
);

/**
 * Points earned without an account (only when POINTS_OPEN_EARNING=1, e.g. for a live demo), keyed by the anonymous
 * voter device key. Moved into points_ledger when that device signs in (claimed_by set).
 */
export const guestPoints = pgTable(
  "guest_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voterKey: text("voter_key").notNull(),
    amount: integer("amount").notNull(),
    reason: pointsReasonEnum("reason").notNull(),
    refId: text("ref_id").notNull(),
    claimedBy: uuid("claimed_by").references(() => users.id, { onDelete: "set null" }),
    claimedAt: tsz("claimed_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("guest_points_once").on(t.voterKey, t.reason, t.refId)],
);
