import { auth } from "@clerk/nextjs/server";

import {
  analyzeStudentProgress,
  generateLearningAlert,
} from "@/lib/ai/adaptive-learning";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { student_id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const role = await getUserRoleById(userId);
  const isTrainer = isTrainerOrAdminRole(role);
  const studentId = body.student_id ?? userId;

  if (studentId !== userId && !isTrainer) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const assessment = await analyzeStudentProgress(studentId);

    if (isTrainer && assessment.risk_level !== "on_track") {
      await generateLearningAlert(studentId, assessment, userId);
    } else if (!isTrainer && assessment.risk_level !== "on_track") {
      await generateLearningAlert(studentId, assessment);
    }

    return Response.json(assessment);
  } catch (err) {
    console.error("[analyze-student]", err);
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
