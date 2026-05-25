import { auth } from "@clerk/nextjs/server";

import { fetchAiReviewSummary } from "@/lib/trainer/student-detail";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const submissionId = searchParams.get("submission_id");
  if (!submissionId) {
    return Response.json({ error: "submission_id required" }, { status: 400 });
  }

  const review = await fetchAiReviewSummary(submissionId);
  if (!review) {
    return Response.json({ error: "No AI review found" }, { status: 404 });
  }

  return Response.json({ review });
}
