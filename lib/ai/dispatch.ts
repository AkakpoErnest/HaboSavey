import { after } from "next/server";
import { settleJob, signJob } from "./settle";

/**
 * Where image jobs run. Netlify cuts normal functions (and their after() work) off at ~26 s, but 3 OpenAI edits often
 * take longer. With JOB_RUNNER=netlify-background the job is handed to netlify/functions/generation-background
 * (up to 15 min). Elsewhere (local, other hosts) it runs in after().
 */
export async function dispatchJob(jobId: string): Promise<void> {
  const base = process.env.URL;
  if (process.env.JOB_RUNNER === "netlify-background" && base) {
    try {
      const res = await fetch(`${base}/.netlify/functions/generation-background`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, sig: signJob(jobId) }),
      });
      if (res.status === 202 || res.ok) return;
      console.error("[ai] background dispatch failed", res.status);
    } catch (err) {
      console.error("[ai] background dispatch failed", err);
    }
  }
  after(() => settleJob(jobId));
}
