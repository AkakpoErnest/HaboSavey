// Netlify background function (the "-background" suffix gives it up to 15 minutes): runs one image generation job.
// Called by lib/ai/dispatch.ts with an HMAC so only our app can start jobs; the job itself only runs once (queued → running).
import { settleJob, verifyJobSignature } from "../../lib/ai/settle";

export default async (req: Request) => {
  const { jobId, sig } = (await req.json().catch(() => ({}))) as { jobId?: string; sig?: string };
  if (!jobId || !sig || !/^[0-9a-f-]{36}$/i.test(jobId) || !verifyJobSignature(jobId, sig)) return new Response("forbidden", { status: 403 });
  await settleJob(jobId);
  return new Response("ok");
};
