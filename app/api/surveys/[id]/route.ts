import { and, eq } from "drizzle-orm";
import type { SurveyDetailResponse } from "@/lib/schemas";
import { HttpError, ok, route, type Params } from "@/lib/api/http";
import { effectiveSurveyStatus, presentSurvey } from "@/lib/api/present";
import { loadQuestions, loadSurveyRow, presentQuestion } from "@/lib/api/surveys";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const GET = route<Params<"id">>(async (_req, { params }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const row = await loadSurveyRow(id);
  if (effectiveSurveyStatus(row) === "draft" && !isStaff(user)) throw new HttpError("not_found", "Survey not found");

  const questions = await loadQuestions(id);
  const answered = user
    ? (
        await getDb()
          .select({ id: schema.surveyResponses.id })
          .from(schema.surveyResponses)
          .where(and(eq(schema.surveyResponses.surveyId, id), eq(schema.surveyResponses.userId, user.id)))
      ).length > 0
    : false;
  return ok<SurveyDetailResponse>({
    survey: presentSurvey(row, questions.length),
    questions: questions.map(presentQuestion),
    answeredByMe: answered,
  });
});
