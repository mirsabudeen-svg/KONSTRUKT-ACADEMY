import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { PrintJobStatus, PrintQueueRow } from "@/lib/hardware/types";
import { estimateQueueClearanceHours } from "@/lib/hardware/print-scheduler";

async function resolveNames(
  userIds: string[]
): Promise<Map<string, { name: string; email: string | null }>> {
  const map = new Map<string, { name: string; email: string | null }>();
  if (userIds.length === 0) return map;

  const clerk = await clerkClient();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const user = await clerk.users.getUser(id);
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          `Cadet ${id.slice(-6)}`;
        map.set(id, {
          name,
          email: user.emailAddresses[0]?.emailAddress ?? null,
        });
      } catch {
        map.set(id, { name: `Cadet ${id.slice(-6)}`, email: null });
      }
    })
  );
  return map;
}

export async function fetchPrintJobsQueue(): Promise<PrintQueueRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("print_jobs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[fetchPrintJobsQueue]", error.message);
    return [];
  }

  const studentIds = [
    ...new Set((data ?? []).map((r) => r.student_id).filter(Boolean)),
  ] as string[];
  const names = await resolveNames(studentIds);

  const moduleIds = [
    ...new Set((data ?? []).map((r) => r.module_id).filter(Boolean)),
  ] as number[];

  const moduleTitles = new Map<number, string>();
  if (moduleIds.length > 0) {
    const { data: modules } = await admin
      .from("modules")
      .select("id, title")
      .in("id", moduleIds);
    for (const m of modules ?? []) {
      moduleTitles.set(m.id, m.title);
    }
  }

  const queued = (data ?? []).filter(
    (j) => j.status === "queued" || j.status === "validating"
  );

  return (data ?? []).map((row) => {
    const profile = row.student_id ? names.get(row.student_id) : undefined;
    const queueIndex = queued.findIndex((q) => q.id === row.id);

    return {
      ...row,
      status: row.status as PrintJobStatus,
      studentName: profile?.name ?? "Unknown",
      studentEmail: profile?.email ?? null,
      moduleTitle: row.module_id
        ? (moduleTitles.get(row.module_id) ?? `Module ${row.module_id}`)
        : null,
      queuePosition: queueIndex >= 0 ? queueIndex + 1 : 0,
    };
  });
}

export type HardwareStats = {
  printsCompletedToday: number;
  totalFilamentGrams: number;
  failedPrintRate: number;
  averagePrintMinutes: number;
  queueClearanceHours: number;
  simulationsToday: number;
  designPromptsToday: number;
  tokensUsedToday: number;
};

export async function fetchHardwareStats(): Promise<HardwareStats> {
  const empty: HardwareStats = {
    printsCompletedToday: 0,
    totalFilamentGrams: 0,
    failedPrintRate: 0,
    averagePrintMinutes: 0,
    queueClearanceHours: 0,
    simulationsToday: 0,
    designPromptsToday: 0,
    tokensUsedToday: 0,
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    completedToday,
    allCompleted,
    allFailed,
    simulations,
    prompts,
    tokenLog,
    clearance,
  ] = await Promise.all([
    admin
      .from("print_jobs")
      .select("weight_grams, actual_print_minutes, estimated_print_minutes")
      .eq("status", "completed")
      .gte("completed_at", todayIso),
    admin
      .from("print_jobs")
      .select("actual_print_minutes, estimated_print_minutes")
      .eq("status", "completed"),
    admin.from("print_jobs").select("id").eq("status", "failed"),
    admin
      .from("code_simulations")
      .select("id")
      .gte("created_at", todayIso),
    admin
      .from("design_prompts")
      .select("id, student_id")
      .gte("created_at", todayIso),
    admin
      .from("token_usage_log")
      .select("tokens_used")
      .gte("created_at", todayIso),
    estimateQueueClearanceHours(),
  ]);

  const completedCount = completedToday.data?.length ?? 0;
  const totalGrams =
    completedToday.data?.reduce((s, j) => s + (j.weight_grams ?? 0), 0) ?? 0;

  const allDone = allCompleted.data ?? [];
  const avgMinutes =
    allDone.length > 0
      ? allDone.reduce(
          (s, j) =>
            s + (j.actual_print_minutes ?? j.estimated_print_minutes ?? 45),
          0
        ) / allDone.length
      : 0;

  const failedCount = allFailed.data?.length ?? 0;
  const totalJobs = allDone.length + failedCount;
  const failRate = totalJobs > 0 ? (failedCount / totalJobs) * 100 : 0;

  const tokensUsed =
    tokenLog.data?.reduce((s, t) => s + (t.tokens_used ?? 1), 0) ?? 0;

  return {
    printsCompletedToday: completedCount,
    totalFilamentGrams: Math.round(totalGrams),
    failedPrintRate: Math.round(failRate),
    averagePrintMinutes: Math.round(avgMinutes),
    queueClearanceHours: clearance,
    simulationsToday: simulations.data?.length ?? 0,
    designPromptsToday: prompts.data?.length ?? 0,
    tokensUsedToday: tokensUsed,
  };
}

export async function fetchPendingValidations() {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("print_jobs")
    .select("id, file_name, file_url, student_id, module_id, validation_passed, created_at")
    .eq("status", "validating")
    .order("created_at", { ascending: true });

  const studentIds = [
    ...new Set((data ?? []).map((r) => r.student_id).filter(Boolean)),
  ] as string[];
  const names = await resolveNames(studentIds);

  return (data ?? []).map((row) => ({
    ...row,
    studentName: row.student_id
      ? (names.get(row.student_id)?.name ?? "Unknown")
      : "Unknown",
  }));
}

export async function fetchStudentHardwareActivity() {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [simulations, prompts, tokens] = await Promise.all([
    admin
      .from("code_simulations")
      .select("student_id")
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("design_prompts")
      .select("student_id")
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("token_usage_log")
      .select("student_id, tokens_used, usage_type")
      .gte("created_at", todayStart.toISOString()),
  ]);

  const activity = new Map<
    string,
    { simulations: number; models: number; tokens: number }
  >();

  for (const s of simulations.data ?? []) {
    const cur = activity.get(s.student_id) ?? {
      simulations: 0,
      models: 0,
      tokens: 0,
    };
    cur.simulations++;
    activity.set(s.student_id, cur);
  }

  for (const p of prompts.data ?? []) {
    const cur = activity.get(p.student_id) ?? {
      simulations: 0,
      models: 0,
      tokens: 0,
    };
    cur.models++;
    activity.set(p.student_id, cur);
  }

  for (const t of tokens.data ?? []) {
    const cur = activity.get(t.student_id) ?? {
      simulations: 0,
      models: 0,
      tokens: 0,
    };
    cur.tokens += t.tokens_used ?? 1;
    activity.set(t.student_id, cur);
  }

  const names = await resolveNames([...activity.keys()]);

  return [...activity.entries()].map(([studentId, stats]) => ({
    studentId,
    studentName: names.get(studentId)?.name ?? `Cadet ${studentId.slice(-6)}`,
    ...stats,
  }));
}

export function isValidPrintJobStatus(value: string): value is PrintJobStatus {
  return [
    "queued",
    "validating",
    "printing",
    "completed",
    "failed",
    "cancelled",
  ].includes(value);
}
