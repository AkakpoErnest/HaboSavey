import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import type { ApiErrorCode } from "@/lib/schemas";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  moderation_rejected: 422,
  internal: 500,
};

export class HttpError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export const fail = (code: ApiErrorCode, message: string) =>
  NextResponse.json({ error: { code, message } }, { status: STATUS[code] });

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError("bad_request", "Body must be JSON");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler so thrown HttpError/ZodError become the standard error shape. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.code, err.message);
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return fail("bad_request", first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid input");
      }
      // Postgres "invalid input syntax" (e.g. a malformed uuid in the URL) → treat as not found.
      const pg = err as { code?: string; cause?: { code?: string } };
      if (pg?.code === "22P02" || pg?.cause?.code === "22P02") return fail("not_found", "Not found");
      console.error("[api]", req.method, req.url, err);
      return fail("internal", "Something went wrong");
    }
  };
}

/** Dynamic route params (Next 15 passes them as a Promise). */
export type Params<K extends string> = { params: Promise<Record<K, string>> };
