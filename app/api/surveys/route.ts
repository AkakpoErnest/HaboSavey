import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { CreateSurveyInput, SurveyStatus, type ListSurveysResponse } from "@/lib/schemas";
import { ok, parseJson, parseQuery, route } from "@/lib/api/http";
import { presentSurvey } from "@/lib/api/present";
import { questionCounts } from "@/lib/api/surveys";
import { getCurrentUser, isStaff, requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const GET = route(async (req) => {
  const { status } = parseQuery(req, z.object({ status: SurveyStatus.optional() }));
  const user = await getCurrentUser();
  const db = getDb();
  const rows = await db.select().from(schema.surveys).orderBy(desc(schema.surveys.createdAt));
  const counts = await questionCounts(rows.map((r) => r.id));
  const answered = user
    ? new Set(
        (
          await db
            .select({ surveyId: schema.surveyResponses.surveyId })
            .from(schema.surveyResponses)
            .where(eq(schema.surveyResponses.userId, user.id))
        ).map((r) => r.surveyId),
      )
    : new Set<string>();

  let surveys = rows.map((r) => ({ ...presentSurvey(r, counts.get(r.id) ?? 0), answeredByMe: answered.has(r.id) }));
  if (!isStaff(user)) surveys = surveys.filter((s) => s.status !== "draft");
  if (status) surveys = surveys.filter((s) => s.status === status);
  return ok<ListSurveysResponse>({ surveys });
});

export const POST = route(async (req) => {
  const staff = await requireStaff();
  const input = await parseJson(req, CreateSurveyInput);
  const db = getDb();
  const survey = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(schema.surveys)
      .values({
        titleJa: input.titleJa,
        titleEn: input.titleEn,
        descriptionJa: input.descriptionJa,
        descriptionEn: input.descriptionEn,
        status: input.status,
        opensAt: input.opensAt ? new Date(input.opensAt) : null,
        closesAt: input.closesAt ? new Date(input.closesAt) : null,
        anonymous: input.anonymous,
        verifiedOnly: input.verifiedOnly,
        createdBy: staff.id,
      })
      .returning();
    await tx.insert(schema.surveyQuestions).values(
      input.questions.map((q, i) => ({
        surveyId: s.id,
        position: i + 1,
        type: q.type,
        labelJa: q.labelJa,
        labelEn: q.labelEn ?? null,
        options: q.options.map((o) => ({ value: o.value, labelJa: o.labelJa, labelEn: o.labelEn ?? null })),
        required: q.required,
      })),
    );
    await tx.insert(schema.auditLog).values({ actorId: staff.id, action: "survey.create", targetType: "survey", targetId: s.id });
    return s;
  });
  return ok({ survey: presentSurvey(survey, input.questions.length) }, { status: 201 });
});

