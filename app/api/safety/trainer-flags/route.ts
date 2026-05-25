import {
  fetchTrainerSafetyFlags,
  updateSafetyFlag,
} from "@/lib/safety/queries";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const flags = await fetchTrainerSafetyFlags();
  const highCritical = flags.filter(
    (f) => f.severity === "high" || f.severity === "critical"
  );

  return Response.json({ flags, highCriticalCount: highCritical.length });
}

export async function PATCH(req: Request) {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { id?: string; reviewed?: boolean; resolved?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const ok = await updateSafetyFlag(body.id, {
    reviewed: body.reviewed ?? true,
    resolved: body.resolved,
    reviewedBy: ctx.userId,
  });

  if (!ok) {
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
