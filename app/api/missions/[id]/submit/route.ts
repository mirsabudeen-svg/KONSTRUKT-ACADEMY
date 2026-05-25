import { auth } from "@clerk/nextjs/server";

import { submitMissionWork } from "@/lib/missions/submit";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  userRateLimitKey,
} from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(
    userRateLimitKey(userId, "mission-submit"),
    RATE_LIMITS.missionSubmit.limit,
    RATE_LIMITS.missionSubmit.windowMs
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const { id } = await params;
  const moduleId = Number(id);

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const workDescription = sanitizeText(
    String(formData.get("workDescription") ?? "")
  );
  const fileEntry = formData.get("file");
  const file =
    fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  const result = await submitMissionWork({
    moduleId,
    workDescription,
    file,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    success: true,
    submissionId: result.submissionId,
    codeReview: result.codeReview,
    message: "Submitted! Waiting for Trainer Review",
  });
}
