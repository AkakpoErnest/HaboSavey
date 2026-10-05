import { z } from "zod";
import { Id, IsoDate, LatLng } from "./common";

export const SurveyStatus = z.enum(["draft", "open", "closed"]);
export type SurveyStatus = z.infer<typeof SurveyStatus>;

export const QuestionType = z.enum(["single", "multi", "rating", "text", "photo", "location"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const QuestionOption = z.object({
  value: z.string().min(1),
  labelJa: z.string(),
  labelEn: z.string().nullable(),
});

export const SurveyQuestion = z.object({
  id: Id,
  position: z.number().int(),
  type: QuestionType,
  labelJa: z.string(),
  labelEn: z.string().nullable(),
  /** Only for single/multi. */
  options: z.array(QuestionOption),
  required: z.boolean(),
});
export type SurveyQuestion = z.infer<typeof SurveyQuestion>;

export const Survey = z.object({
  id: Id,
  titleJa: z.string(),
  titleEn: z.string().nullable(),
  descriptionJa: z.string(),
  descriptionEn: z.string().nullable(),
  status: SurveyStatus,
  opensAt: IsoDate.nullable(),
  closesAt: IsoDate.nullable(),
  anonymous: z.boolean(),
  verifiedOnly: z.boolean(),
  questionCount: z.number().int(),
  createdAt: IsoDate,
});
export type Survey = z.infer<typeof Survey>;

/** GET /api/surveys?status= */
export const ListSurveysResponse = z.object({
  surveys: z.array(Survey.extend({ answeredByMe: z.boolean() })),
});
export type ListSurveysResponse = z.infer<typeof ListSurveysResponse>;

/** GET /api/surveys/:id */
export const SurveyDetailResponse = z.object({
  survey: Survey,
  questions: z.array(SurveyQuestion),
  answeredByMe: z.boolean(),
});
export type SurveyDetailResponse = z.infer<typeof SurveyDetailResponse>;

/** POST /api/surveys (staff) */
export const CreateSurveyInput = z.object({
  titleJa: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional(),
  descriptionJa: z.string().max(5000).default(""),
  descriptionEn: z.string().max(5000).optional(),
  status: SurveyStatus.default("draft"),
  opensAt: IsoDate.optional(),
  closesAt: IsoDate.optional(),
  anonymous: z.boolean().default(false),
  verifiedOnly: z.boolean().default(false),
  questions: z
    .array(
      z.object({
        type: QuestionType,
        labelJa: z.string().min(1).max(500),
        labelEn: z.string().max(500).optional(),
        options: z.array(QuestionOption).default([]),
        required: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(50),
});
export type CreateSurveyInput = z.infer<typeof CreateSurveyInput>;

/**
 * Answer value per question type:
 *  single → string (option value) · multi → string[] · rating → 1..5
 *  text → string · photo → storage path from /api/uploads (bucket survey-uploads) · location → {lat,lng}
 */
export const AnswerValue = z.union([
  z.string().max(5000),
  z.array(z.string()).max(50),
  z.number().int().min(1).max(5),
  LatLng,
]);
export type AnswerValue = z.infer<typeof AnswerValue>;

/** POST /api/surveys/:id/responses */
export const SubmitResponseInput = z.object({
  answers: z.array(z.object({ questionId: Id, value: AnswerValue })).max(50),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseInput>;

/** GET /api/surveys/:id/results (staff). Add ?format=csv for a CSV download. */
export const QuestionResult = z.object({
  questionId: Id,
  type: QuestionType,
  labelJa: z.string(),
  answered: z.number().int(),
  /** single/multi: option value → count. rating: "1".."5" → count. */
  counts: z.record(z.string(), z.number().int()),
  /** rating only */
  average: z.number().nullable(),
  /** text: latest answers (up to 200). photo: signed URLs. location: points. */
  samples: z.array(z.union([z.string(), LatLng])),
});
export const SurveyResultsResponse = z.object({
  survey: Survey,
  totalResponses: z.number().int(),
  questions: z.array(QuestionResult),
});
export type SurveyResultsResponse = z.infer<typeof SurveyResultsResponse>;
