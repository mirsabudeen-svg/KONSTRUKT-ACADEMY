import {
  requireTrainerContext,
  updatePrintQueueStatus,
} from "@/lib/supabase/trainer-actions";
import { isValidPrintQueueStatus } from "@/lib/trainer/constants";

export async function PATCH(req: Request) {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status) {
    return Response.json(
      { error: "id and status are required" },
      { status: 400 }
    );
  }

  if (!isValidPrintQueueStatus(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await updatePrintQueueStatus(id, status);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ success: true });
}
