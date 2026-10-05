import { SubmitResponseInput, type AnswerValue } from "@/lib/schemas";
import { HttpError, ok, parseJson, route, type Params } from "@/lib/api/http";
import { effectiveSurveyStatus } from "@/lib/api/present";
import { loadQuestions, loadSurveyRow } from "@/lib/api/surveys";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ownsPath } from "@/lib/storage";

type QuestionRow = Awaited<ReturnType<typeof loadQuestions>>[number];

function checkAnswer(q: QuestionRow, value: AnswerValue, userId: string): boolean {
  const optionValues = new Set(q.options.map((o) => o.value));
  switch (q.type) {
    case "single":
      return typeof value === "string" && optionValues.has(value);
    case "multi":
      return Array.isArray(value) && value.every((v) => optionValues.has(v)) && new Set(value).size === value.length;
    case "rating":
      return typeof value === "number";
    case "text":
      return typeof value === "string";
    case "photo":
      return typeof value === "string" && ownsPath(userId, value);
    case "location":
      return typeof value === "object" && value !== null && !Array.isArray(value) && "lat" in value;
  }
}

const isEmpty = (v: AnswerValue) => (typeof v === "string" ? v.trim() === "" : Array.isArray(v) ? v.length === 0 : false);

export const POST = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const { answers } = await parseJson(req, SubmitResponseInput);

  const survey = await loadSurveyRow(id);
  if (effectiveSurveyStatus(survey) !== "open") throw new HttpError("conflict", "This survey is not open");
  if (survey.verifiedOnly && !user.verifiedLocal) throw new HttpError("forbidden", "Only verified Kesennuma residents can answer");

  const questions = await loadQuestions(id);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const given = new Map<string, AnswerValue>();
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) throw new HttpError("bad_request", "Unknown question");
    if (given.has(a.questionId)) throw new HttpError("bad_request", "Duplicate answer");
    if (isEmpty(a.value)) continue;
    if (!checkAnswer(q, a.value, user.id)) throw new HttpError("bad_request", `Invalid answer for question ${q.position}`);
    given.set(a.questionId, a.value);
  }
  const missing = questions.find((q) => q.required && !given.has(q.id));
  if (missing) throw new HttpError("bad_request", `Question ${missing.position} is required`);

  const db = getDb();
  const inserted = await db.transaction(async (tx) => {
    const [response] = await tx
      .insert(schema.surveyResponses)
      .values({ surveyId: id, userId: user.id })
      .onConflictDoNothing()
      .returning();
    if (!response) return false;
    if (given.size) {
      await tx
        .insert(schema.surveyAnswers)
        .values([...given].map(([questionId, value]) => ({ responseId: response.id, questionId, value })));
    }
    return true;
  });
  if (!inserted) throw new HttpError("conflict", "You have already answered this survey");
  return ok({ submitted: true }, { status: 201 });
});
