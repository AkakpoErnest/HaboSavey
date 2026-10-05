import { desc, eq, inArray } from "drizzle-orm";
import type { SurveyResultsResponse } from "@/lib/schemas";
import { route, ok, type Params } from "@/lib/api/http";
import { presentSurvey } from "@/lib/api/present";
import { loadQuestions, loadSurveyRow } from "@/lib/api/surveys";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { signUrls } from "@/lib/storage";

type LatLng = { lat: number; lng: number };

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /api/surveys/:id/results (staff). ?format=csv → one row per response. */
export const GET = route<Params<"id">>(async (req, { params }) => {
  const { id } = await params;
  await requireStaff();
  const survey = await loadSurveyRow(id);
  const questions = await loadQuestions(id);
  const db = getDb();

  const responses = await db
    .select({ id: schema.surveyResponses.id, userId: schema.surveyResponses.userId, submittedAt: schema.surveyResponses.submittedAt })
    .from(schema.surveyResponses)
    .where(eq(schema.surveyResponses.surveyId, id))
    .orderBy(desc(schema.surveyResponses.submittedAt));
  const answers = responses.length
    ? await db
        .select()
        .from(schema.surveyAnswers)
        .where(inArray(schema.surveyAnswers.responseId, responses.map((r) => r.id)))
    : [];

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const byResponse = new Map<string, Map<string, unknown>>();
    for (const a of answers) {
      if (!byResponse.has(a.responseId)) byResponse.set(a.responseId, new Map());
      byResponse.get(a.responseId)!.set(a.questionId, a.value);
    }
    const header = ["response_id", "submitted_at", ...(survey.anonymous ? [] : ["user_id"]), ...questions.map((q) => `Q${q.position} ${q.labelJa}`)];
    const lines = [header.map(csvCell).join(",")];
    for (const r of responses) {
      const vals = byResponse.get(r.id) ?? new Map();
      lines.push(
        [r.id, r.submittedAt.toISOString(), ...(survey.anonymous ? [] : [r.userId]), ...questions.map((q) => vals.get(q.id))]
          .map(csvCell)
          .join(","),
      );
    }
    // BOM so Excel (common at city hall) opens Japanese text correctly.
    return new Response("﻿" + lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="survey-${id}.csv"`,
      },
    });
  }

  const photoPaths = answers
    .filter((a) => questions.find((q) => q.id === a.questionId)?.type === "photo")
    .map((a) => a.value as string);
  const photoUrls = await signUrls("survey-uploads", photoPaths);

  const results: SurveyResultsResponse["questions"] = questions.map((q) => {
    const vals = answers.filter((a) => a.questionId === q.id).map((a) => a.value);
    const counts: Record<string, number> = {};
    const bump = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
    let average: number | null = null;
    let samples: (string | LatLng)[] = [];
    if (q.type === "single") vals.forEach((v) => bump(String(v)));
    if (q.type === "multi") vals.forEach((v) => (v as string[]).forEach(bump));
    if (q.type === "rating") {
      vals.forEach((v) => bump(String(v)));
      average = vals.length ? Math.round((vals.reduce((s: number, v) => s + Number(v), 0) / vals.length) * 100) / 100 : null;
    }
    if (q.type === "text") samples = (vals as string[]).slice(0, 200);
    if (q.type === "photo") samples = (vals as string[]).map((p) => photoUrls.get(p)).filter((u): u is string => !!u).slice(0, 200);
    if (q.type === "location") samples = (vals as LatLng[]).slice(0, 1000);
    return { questionId: q.id, type: q.type, labelJa: q.labelJa, answered: vals.length, counts, average, samples };
  });

  return ok<SurveyResultsResponse>({
    survey: presentSurvey(survey, questions.length),
    totalResponses: responses.length,
    questions: results,
  });
});

