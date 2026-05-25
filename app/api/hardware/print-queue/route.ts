import { auth } from "@clerk/nextjs/server";

import { estimatePrintJob } from "@/lib/hardware/print-estimator";
import {
  fetchPrintJobsQueue,
  isValidPrintJobStatus,
} from "@/lib/hardware/queries";
import { schedulePrintJob } from "@/lib/hardware/print-scheduler";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { PrintJobStatus } from "@/lib/hardware/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const jobs = await fetchPrintJobsQueue();
  return Response.json({ jobs });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  let body: {
    file_url?: string;
    file_name?: string;
    module_id?: number;
    submission_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { file_url, file_name, module_id, submission_id } = body;

  if (!file_url || !module_id) {
    return Response.json(
      { error: "file_url and module_id are required" },
      { status: 400 }
    );
  }

  const estimate = await estimatePrintJob(file_url, module_id);
  const admin = createSupabaseAdmin();

  const { data: job, error } = await admin
    .from("print_jobs")
    .insert({
      student_id: userId,
      submission_id: submission_id ?? null,
      module_id,
      file_url,
      file_name: file_name ?? null,
      estimated_print_minutes: estimate.estimated_minutes,
      material: estimate.material,
      weight_grams: estimate.weight_grams,
      status: "validating",
      validation_issues: estimate.potential_issues,
    })
    .select("*")
    .single();

  if (error || !job) {
    return Response.json(
      { error: error?.message ?? "Failed to create print job" },
      { status: 500 }
    );
  }

  const schedule = await schedulePrintJob(userId, job.id);

  return Response.json({
    job,
    estimate,
    schedule: "error" in schedule ? null : schedule,
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  let body: {
    id?: string;
    status?: string;
    validation_passed?: boolean;
    actual_print_minutes?: number;
    scheduled_at?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status, validation_passed, actual_print_minutes, scheduled_at } =
    body;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (status) {
    if (!isValidPrintJobStatus(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = status as PrintJobStatus;
    if (status === "printing") updates.started_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
  }

  if (validation_passed != null) updates.validation_passed = validation_passed;
  if (actual_print_minutes != null)
    updates.actual_print_minutes = actual_print_minutes;
  if (scheduled_at) updates.scheduled_at = scheduled_at;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("print_jobs")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 }
    );
  }

  return Response.json({ job: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdmin();
  const ctx = await requireTrainerContext();
  const isTrainer = !("error" in ctx);

  let query = admin.from("print_jobs").update({ status: "cancelled" }).eq("id", id);

  if (!isTrainer) {
    query = query.eq("student_id", userId);
  }

  const { data, error } = await query.select("id").maybeSingle();

  if (error || !data) {
    return Response.json({ error: "Cancel failed" }, { status: 404 });
  }

  return Response.json({ success: true });
}
