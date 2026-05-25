import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { PrintJobStatus } from "@/lib/hardware/types";

const DEFAULT_PRINT_MINUTES = 45;

export type ScheduleResult = {
  scheduledAt: string;
  estimatedCompletion: string;
  message: string;
};

export async function schedulePrintJob(
  studentId: string,
  jobId: string
): Promise<ScheduleResult | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();

  const { data: job, error: jobError } = await admin
    .from("print_jobs")
    .select("id, estimated_print_minutes, student_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    return { error: "Print job not found" };
  }

  const printMinutes = job.estimated_print_minutes ?? DEFAULT_PRINT_MINUTES;

  const { data: activeJobs } = await admin
    .from("print_jobs")
    .select("id, estimated_print_minutes, scheduled_at, started_at, status")
    .in("status", ["queued", "validating", "printing"] as PrintJobStatus[])
    .neq("id", jobId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  let printerFreeAt = new Date();

  for (const active of activeJobs ?? []) {
    const start = active.scheduled_at
      ? new Date(active.scheduled_at)
      : active.started_at
        ? new Date(active.started_at)
        : new Date();
    const durationMs =
      (active.estimated_print_minutes ?? DEFAULT_PRINT_MINUTES) * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);
    if (end > printerFreeAt) {
      printerFreeAt = end;
    }
  }

  const scheduledAt = printerFreeAt.toISOString();
  const estimatedCompletion = new Date(
    printerFreeAt.getTime() + printMinutes * 60 * 1000
  ).toISOString();

  const { error: updateError } = await admin
    .from("print_jobs")
    .update({ scheduled_at: scheduledAt, status: "queued" })
    .eq("id", jobId);

  if (updateError) {
    return { error: updateError.message };
  }

  const scheduledTime = printerFreeAt.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const completionTime = new Date(estimatedCompletion).toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const message = `Your print is scheduled for ${scheduledTime}. Estimated completion: ${completionTime}`;

  await admin.from("notifications").insert({
    student_id: studentId,
    type: "trainer_message",
    title: "Print Scheduled",
    message,
    module_id: null,
    read: false,
  });

  return { scheduledAt, estimatedCompletion, message };
}

export async function estimateQueueClearanceHours(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const admin = createSupabaseAdmin();
  const { data: jobs } = await admin
    .from("print_jobs")
    .select("estimated_print_minutes")
    .in("status", ["queued", "validating", "printing"] as PrintJobStatus[]);

  const totalMinutes = (jobs ?? []).reduce(
    (sum, j) => sum + (j.estimated_print_minutes ?? DEFAULT_PRINT_MINUTES),
    0
  );

  return Math.ceil(totalMinutes / 60);
}
