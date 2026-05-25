import { reviewSubmission } from "@/lib/trainer/review";

export async function POST(req: Request) {
  let body: {
    submission_id?: string;
    action?: "approve" | "reject";
    feedback?: string;
    score?: number;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { submission_id, action, feedback, score } = body;

  if (!submission_id || !action || (action !== "approve" && action !== "reject")) {
    return Response.json(
      { error: "submission_id and action (approve|reject) are required" },
      { status: 400 }
    );
  }

  const result = await reviewSubmission({
    submissionId: submission_id,
    action,
    feedback,
    score,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    success: true,
    action: result.action,
    next_module_unlocked: result.nextModuleUnlocked,
    next_module_id: result.nextModuleId,
  });
}
