import "server-only";

import { resolveClerkDisplayNames } from "@/lib/admin/clerk-names";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type CohortStatus = "Active" | "Completed" | "Upcoming";

export type AdminCohortRow = {
  id: string;
  name: string;
  startDate: string | null;
  trainerId: string | null;
  trainerName: string | null;
  studentCount: number;
  averageProgress: number;
  status: CohortStatus;
};

function computeCohortStatus(
  startDate: string | null,
  averageProgress: number
): CohortStatus {
  if (startDate) {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start > today) return "Upcoming";
  }
  if (averageProgress >= 100) return "Completed";
  return "Active";
}

export async function fetchAdminCohorts(): Promise<{
  cohorts: AdminCohortRow[];
  trainers: { id: string; name: string }[];
}> {
  if (!isSupabaseConfigured()) {
    return { cohorts: [], trainers: [] };
  }

  const admin = createSupabaseAdmin();

  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id, name, start_date, trainer_id")
    .order("start_date", { ascending: false });

  const { data: trainers } = await admin
    .from("users")
    .select("id")
    .in("role", ["trainer", "admin"]);

  const trainerIds = (trainers ?? []).map((t) => t.id);
  const trainerNames = await resolveClerkDisplayNames(trainerIds);

  const { data: students } = await admin
    .from("users")
    .select("id, cohort_id")
    .eq("role", "student");

  const { data: progressRows } = await admin
    .from("progress")
    .select("student_id, status")
    .eq("status", "completed");

  const completedByStudent = new Map<string, number>();
  for (const p of progressRows ?? []) {
    completedByStudent.set(
      p.student_id,
      (completedByStudent.get(p.student_id) ?? 0) + 1
    );
  }

  const cohortRows: AdminCohortRow[] = [];

  for (const cohort of cohorts ?? []) {
    const cohortStudents = (students ?? []).filter(
      (s) => s.cohort_id === cohort.id
    );
    const studentCount = cohortStudents.length;
    const avgProgress =
      studentCount > 0
        ? Math.round(
            cohortStudents.reduce(
              (sum, s) => sum + ((completedByStudent.get(s.id) ?? 0) / 10) * 100,
              0
            ) / studentCount
          )
        : 0;

    cohortRows.push({
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.start_date,
      trainerId: cohort.trainer_id,
      trainerName: cohort.trainer_id
        ? trainerNames.get(cohort.trainer_id)?.name ?? null
        : null,
      studentCount,
      averageProgress: avgProgress,
      status: computeCohortStatus(cohort.start_date, avgProgress),
    });
  }

  return {
    cohorts: cohortRows,
    trainers: trainerIds.map((id) => ({
      id,
      name: trainerNames.get(id)?.name ?? `Trainer ${id.slice(-4)}`,
    })),
  };
}

export async function createAdminCohort(input: {
  name: string;
  startDate: string | null;
  trainerId: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("cohorts")
    .insert({
      name: input.name.trim(),
      start_date: input.startDate,
      trainer_id: input.trainerId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed" };
  return { ok: true, id: data.id };
}

export async function updateAdminCohort(input: {
  cohortId: string;
  name?: string;
  startDate?: string | null;
  trainerId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.startDate !== undefined) updates.start_date = input.startDate;
  if (input.trainerId !== undefined) updates.trainer_id = input.trainerId;

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No updates provided" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("cohorts")
    .update(updates)
    .eq("id", input.cohortId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function archiveAdminCohort(
  cohortId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();

  await admin
    .from("users")
    .update({ cohort_id: null })
    .eq("cohort_id", cohortId);

  const { error } = await admin.from("cohorts").delete().eq("id", cohortId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
