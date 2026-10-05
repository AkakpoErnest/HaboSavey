import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isLocalMode } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Bucket = "originals" | "generated" | "survey-uploads" | "poll-images";
export const BUCKETS: readonly Bucket[] = ["originals", "generated", "survey-uploads", "poll-images"];
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** User-owned objects live under "<userId>/…" so ownership checks are a prefix test. */
export const ownsPath = (userId: string, p: string) => p.startsWith(`${userId}/`) && !p.includes("..");

// ── Local mode: files under .data/storage, served by /api/dev-storage ────────────────────────────
const LOCAL_ROOT = path.join(process.cwd(), ".data", "storage");
const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";
const devSecret = () => process.env.DEV_STORAGE_SECRET ?? "habosavey-local-dev";

export function localFilePath(bucket: Bucket, p: string): string {
  if (!BUCKETS.includes(bucket) || p.includes("..") || p.startsWith("/")) throw new Error("Bad storage path");
  return path.join(LOCAL_ROOT, bucket, p);
}

const sign = (bucket: string, p: string, kind: "get" | "put", exp: number) =>
  createHmac("sha256", devSecret()).update(`${kind}:${bucket}/${p}:${exp}`).digest("hex");

export function verifyLocalToken(bucket: string, p: string, kind: "get" | "put", exp: string | null, token: string | null) {
  if (!exp || !token || Number(exp) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(bucket, p, kind, Number(exp)));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function localUrl(bucket: Bucket, p: string, kind: "get" | "put") {
  const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL;
  const url = new URL(`/api/dev-storage/${bucket}/${p}`, appUrl());
  url.searchParams.set("exp", String(exp));
  url.searchParams.set("token", sign(bucket, p, kind, exp));
  return url.toString();
}

// ── Public API (same behaviour in both modes) ────────────────────────────────────────────────────

/** Signs many paths in one call per bucket. Returns path → URL (missing paths are omitted). */
export async function signUrls(bucket: Bucket, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  if (isLocalMode()) {
    for (const p of unique) out.set(p, localUrl(bucket, p, "get"));
    return out;
  }
  const { data, error } = await supabaseAdmin().storage.from(bucket).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error) throw error;
  for (const item of data ?? []) if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  return out;
}

export async function signUrl(bucket: Bucket, p: string | null | undefined): Promise<string | null> {
  if (!p) return null;
  return (await signUrls(bucket, [p])).get(p) ?? null;
}

/** URL the browser PUTs the file to (body = file, Content-Type = file type). */
export async function createUploadUrl(bucket: Bucket, p: string): Promise<{ uploadUrl: string; token: string }> {
  if (isLocalMode()) {
    const uploadUrl = localUrl(bucket, p, "put");
    return { uploadUrl, token: new URL(uploadUrl).searchParams.get("token")! };
  }
  const { data, error } = await supabaseAdmin().storage.from(bucket).createSignedUploadUrl(p);
  if (error || !data) throw error ?? new Error("Could not create upload URL");
  return { uploadUrl: data.signedUrl, token: data.token };
}

export async function download(bucket: Bucket, p: string): Promise<Buffer> {
  if (isLocalMode()) return readFile(localFilePath(bucket, p));
  const { data, error } = await supabaseAdmin().storage.from(bucket).download(p);
  if (error || !data) throw error ?? new Error(`Missing ${bucket}/${p}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function upload(bucket: Bucket, p: string, bytes: Buffer, contentType: string) {
  if (isLocalMode()) {
    const file = localFilePath(bucket, p);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return;
  }
  const { error } = await supabaseAdmin().storage.from(bucket).upload(p, bytes, { contentType, upsert: true });
  if (error) throw error;
}
