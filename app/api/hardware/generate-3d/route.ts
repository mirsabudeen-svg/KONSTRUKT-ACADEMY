import { auth } from "@clerk/nextjs/server";

import { createMeshyTextTo3DJob } from "@/lib/hardware/meshy-client";
import { validateSTLSubmission } from "@/lib/hardware/design-validator";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  userRateLimitKey,
} from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { deductAiToken, getTokenBalance } from "@/lib/tokens/deduct";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    prompt?: string;
    student_id?: string;
    module_id?: number;
    what?: string;
    style?: string;
    details?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prompt, module_id, what, style, details } = body;
  const studentId = body.student_id ?? userId;

  if (studentId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = checkRateLimit(
    userRateLimitKey(userId, "generate-3d"),
    RATE_LIMITS.generate3d.limit,
    RATE_LIMITS.generate3d.windowMs
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  if (!prompt?.trim() || !module_id) {
    return Response.json(
      { error: "prompt and module_id are required" },
      { status: 400 }
    );
  }

  const balance = await getTokenBalance(userId);
  if (balance <= 0) {
    return Response.json(
      { error: "No tokens remaining", remaining: 0 },
      { status: 402 }
    );
  }

  const deduction = await deductAiToken(userId, true, "meshy_3d", module_id);
  if (!deduction.ok) {
    return Response.json(
      { error: "Insufficient tokens", remaining: deduction.remaining },
      { status: 402 }
    );
  }

  let meshyJob;
  try {
    meshyJob = await createMeshyTextTo3DJob(prompt.trim());
  } catch (err) {
    console.error("[generate-3d]", err);
    return Response.json(
      { error: "Meshy generation failed" },
      { status: 502 }
    );
  }

  if (isSupabaseConfigured()) {
    try {
      const admin = createSupabaseAdmin();
      await admin.from("design_prompts").insert({
        student_id: userId,
        module_id,
        what: what ?? null,
        style: style ?? null,
        details: details ?? null,
        generated_prompt: prompt.trim(),
        meshy_job_id: meshyJob.jobId,
        result_url: meshyJob.previewUrl,
        tokens_used: 1,
      });
    } catch (err) {
      console.error("[generate-3d] log failed", err);
    }
  }

  const validation = meshyJob.previewUrl
    ? await validateSTLSubmission(meshyJob.previewUrl, module_id, userId)
    : null;

  return Response.json({
    job_id: meshyJob.jobId,
    preview_url: meshyJob.previewUrl,
    status: meshyJob.status,
    remaining_tokens: deduction.remaining,
    validation,
  });
}
