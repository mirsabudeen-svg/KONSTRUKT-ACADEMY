import { createMaintenanceTask } from "@/lib/aria/aria-engine";
import { runMaintenanceTask } from "@/lib/aria/maintenance";
import { requireAdminContext } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SAFE_TASKS = [
  "token_audit",
  "user_sync",
  "database_cleanup",
  "orphan_check",
  "cache_clear",
  "backup",
];

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { task_type?: string; title?: string; description?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const taskType = body.task_type;
  if (!taskType || !SAFE_TASKS.includes(taskType)) {
    return Response.json(
      { error: `Invalid task_type. Allowed: ${SAFE_TASKS.join(", ")}` },
      { status: 400 }
    );
  }

  let taskId: string | null = null;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("maintenance_tasks")
      .insert({
        title: body.title ?? `Run ${taskType}`,
        description: body.description,
        task_type: taskType,
        status: "running",
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    taskId = data?.id ?? null;
  }

  const result = await runMaintenanceTask(taskType);

  if (isSupabaseConfigured() && taskId) {
    const admin = createSupabaseAdmin();
    await admin
      .from("maintenance_tasks")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        result,
      })
      .eq("id", taskId);
  }

  return Response.json(result);
}

export async function PUT(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { title?: string; description?: string; task_type?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.task_type) {
    return Response.json({ error: "title and task_type required" }, { status: 400 });
  }

  const task = await createMaintenanceTask({
    adminId: ctx.userId,
    title: body.title,
    description: body.description,
    taskType: body.task_type,
  });

  return Response.json({ task });
}
