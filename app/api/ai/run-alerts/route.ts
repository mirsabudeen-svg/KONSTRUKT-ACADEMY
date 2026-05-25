import { auth } from "@clerk/nextjs/server";

import { runAlertChecks } from "@/lib/ai/alert-engine";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runAlertChecks(userId);
    return Response.json(result);
  } catch (err) {
    console.error("[run-alerts]", err);
    return Response.json({ error: "Alert check failed" }, { status: 500 });
  }
}
