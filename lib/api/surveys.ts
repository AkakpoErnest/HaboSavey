import { asc, count, eq, inArray } from "drizzle-orm";
import type { SurveyQuestion } from "@/lib/schemas";
import { HttpError } from "@/lib/api/http";
import { getDb, schema } from "@/lib/db";

type SurveyRow = typeof schema.surveys.$inferSelect;
type QuestionRow = typeof schema.surveyQuestions.$inferSelect;

export async function loadSurveyRow(id: string): Promise<SurveyRow> {
  const [row] = await getDb().select().from(schema.surveys).where(eq(schema.surveys.id, id));
  if (!row) throw new HttpError("not_found", "Survey not found");
  return row;
}

export async function loadQuestions(surveyId: string): Promise<QuestionRow[]> {
  return getDb()
    .select()
    .from(schema.surveyQuestions)
    .where(eq(schema.surveyQuestions.surveyId, surveyId))
    .orderBy(asc(schema.surveyQuestions.position));
}

export async function questionCounts(surveyIds: string[]): Promise<Map<string, number>> {
  if (surveyIds.length === 0) return new Map();
  const rows = await getDb()
    .select({ surveyId: schema.surveyQuestions.surveyId, n: count() })
    .from(schema.surveyQuestions)
    .where(inArray(schema.surveyQuestions.surveyId, surveyIds))
    .groupBy(schema.surveyQuestions.surveyId);
  return new Map(rows.map((r) => [r.surveyId, r.n]));
}

export const presentQuestion = (q: QuestionRow): SurveyQuestion => ({
  id: q.id,
  position: q.position,
  type: q.type,
  labelJa: q.labelJa,
  labelEn: q.labelEn,
  options: q.options,
  required: q.required,
});
