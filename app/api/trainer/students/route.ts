import { auth } from "@clerk/nextjs/server";

import { fetchStudentDetail } from "@/lib/trainer/student-detail";
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
  const studentId = searchParams.get("student_id");
  if (!studentId) {
    return Response.json({ error: "student_id required" }, { status: 400 });
  }

  const detail = await fetchStudentDetail(studentId);
  if (!detail) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  return Response.json({ student: detail });
}
