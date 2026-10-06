import path from "node:path";
import { fail } from "@/lib/api/http";
import { isLocalMode } from "@/lib/env";
import { BUCKETS, PUBLIC_BUCKETS, readLocalObject, verifyLocalToken, writeLocalObject, type Bucket } from "@/lib/storage";

/**
 * Local-mode stand-in for Supabase Storage signed URLs (files on disk, or Netlify Blobs when hosted on Netlify).
 * 404 whenever Supabase is configured.
 */
type Ctx = { params: Promise<{ bucket: string; path: string[] }> };
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

async function resolve(req: Request, ctx: Ctx, kind: "get" | "put") {
  if (!isLocalMode()) return null;
  const { bucket, path: parts } = await ctx.params;
  const p = parts.join("/");
  const q = new URL(req.url).searchParams;
  if (!BUCKETS.includes(bucket as Bucket) || !verifyLocalToken(bucket, p, kind, q.get("exp"), q.get("token"))) return null;
  return { bucket: bucket as Bucket, p };
}

export async function GET(req: Request, ctx: Ctx) {
  const r = await resolve(req, ctx, "get");
  if (!r) return fail("not_found", "Not found");
  const bytes = await readLocalObject(r.bucket, r.p);
  if (!bytes) return fail("not_found", "Not found");
  const ext = path.extname(r.p).slice(1).toLowerCase();
  // Public poll images: cache in browsers and on Netlify's CDN (the URL is signed + changes when it expires).
  const cache: Record<string, string> = PUBLIC_BUCKETS.includes(r.bucket)
    ? {
        "cache-control": "public, max-age=86400, immutable",
        "netlify-cdn-cache-control": "public, max-age=86400, durable",
        "netlify-vary": "query=exp|token",
      }
    : { "cache-control": "private, max-age=3600" };
  return new Response(new Uint8Array(bytes), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", ...cache } });
}

export async function PUT(req: Request, ctx: Ctx) {
  const r = await resolve(req, ctx, "put");
  if (!r) return fail("forbidden", "Invalid upload URL");
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return fail("bad_request", "File must be 1 byte – 15 MB");
  const ext = path.extname(r.p).slice(1).toLowerCase();
  await writeLocalObject(r.bucket, r.p, bytes, TYPES[ext] ?? "application/octet-stream");
  return Response.json({ Key: r.p });
}
