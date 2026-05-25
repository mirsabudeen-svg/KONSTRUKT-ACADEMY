import { auth } from "@clerk/nextjs/server";

import { markSubmissionOpened } from "@/lib/trainer/student-detail";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

type RouteParams = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await markSubmissionOpened(id);
  return Response.json({ ok: true });
}
