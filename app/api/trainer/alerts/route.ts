import { auth } from "@clerk/nextjs/server";

import {
  fetchLearningAlerts,
  resolveLearningAlert,
  sendStudentMessageFromTrainer,
} from "@/lib/ai/alert-engine";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const alerts = await fetchLearningAlerts(false);
  return Response.json({ alerts });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { alert_id?: string; action?: string; student_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "message" && body.student_id && body.message?.trim()) {
    const clerk = await clerkClient();
    let trainerName = "Your trainer";
    try {
      const user = await clerk.users.getUser(userId);
      trainerName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        trainerName;
    } catch {
      /* use default */
    }

    const result = await sendStudentMessageFromTrainer(
      body.student_id,
      body.message.trim(),
      trainerName
    );
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  if (!body.alert_id) {
    return Response.json({ error: "alert_id required" }, { status: 400 });
  }

  const result = await resolveLearningAlert(body.alert_id);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ ok: true });
}
