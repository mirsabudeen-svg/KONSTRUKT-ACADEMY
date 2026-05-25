import { auth } from "@clerk/nextjs/server";

import { executeBulkAction } from "@/lib/trainer/analytics";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    action?: "message" | "refill" | "approve" | "export";
    student_ids?: string[];
    payload?: { message?: string; title?: string; score?: number };
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || !body.student_ids?.length) {
    return Response.json(
      { error: "action and student_ids are required" },
      { status: 400 }
    );
  }

  const result = await executeBulkAction({
    action: body.action,
    studentIds: body.student_ids,
    trainerId: userId,
    payload: body.payload,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (body.action === "export" && result.result && typeof result.result === "object" && "csv" in result.result) {
    return new Response(String((result.result as { csv: string }).csv), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="students-export.csv"',
      },
    });
  }

  return Response.json(result.result);
}
