import { auth } from "@clerk/nextjs/server";

import { sendWeeklyReportsToAll } from "@/lib/communications/whatsapp";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";
import { isAdminRole } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { cohort_id?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  if (body.cohort_id && !isAdminRole(role) && role !== "trainer") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await sendWeeklyReportsToAll(body.cohort_id ?? null);
  return Response.json(result);
}
