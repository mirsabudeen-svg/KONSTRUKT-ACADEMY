import {
  checkAPIHealth,
  gatherSystemContext,
  getDatabaseHealth,
  getRecentErrors,
} from "@/lib/aria/system-context";
import { listMaintenanceTasks } from "@/lib/aria/aria-engine";
import { requireAdminContext } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const [context, dbHealth, recentErrors, maintenanceTasks] = await Promise.all([
    gatherSystemContext(),
    getDatabaseHealth(),
    getRecentErrors(),
    listMaintenanceTasks(),
  ]);

  let errorTimeline: {
    id: string;
    check_type: string;
    status: string;
    error_message: string | null;
    checked_at: string;
    response_time_ms: number | null;
  }[] = [];

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("system_health_logs")
      .select("id, check_type, status, error_message, checked_at, response_time_ms")
      .in("status", ["down", "degraded"])
      .order("checked_at", { ascending: false })
      .limit(50);
    errorTimeline = data ?? [];
  }

  return Response.json({
    context,
    dbHealth,
    recentErrors,
    maintenanceTasks,
    errorTimeline,
    checkedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { check_type?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* run all checks */
  }

  const checkType = body.check_type;

  if (checkType) {
    const { checks } = await checkAPIHealth();
    const match = checks.find((c) => c.service === checkType);
    return Response.json({ check: match ?? null, checkedAt: new Date().toISOString() });
  }

  const health = await checkAPIHealth({ persist: true });
  const context = await gatherSystemContext();

  return Response.json({
    checks: health.checks,
    summary: health.summary,
    platform_stats: context.platform_stats,
    checkedAt: new Date().toISOString(),
  });
}
