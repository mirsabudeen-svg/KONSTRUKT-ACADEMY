import "server-only";

import { resolveClerkDisplayNames } from "@/lib/admin/clerk-names";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/db/types";

export type StudentRiskLevel = "on_track" | "at_risk" | "critical";

export type AdminStudentRow = {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
  cohortId: string | null;
  cohortName: string | null;
  role: UserRole;
  modulesDone: number;
  modulesTotal: number;
  averageScore: number;
  totalXp: number;
  level: string;
  tokensRemaining: number;
  lastLogin: string | null;
  riskLevel: StudentRiskLevel;
};

export type AdminStudentsSummary = {
  total: number;
  onTrack: number;
  atRisk: number;
  critical: number;
};

export type AdminStudentsData = {
  students: AdminStudentRow[];
  cohorts: { id: string; name: string }[];
  summary: AdminStudentsSummary;
};

async function computeRiskLevels(
  studentIds: string[]
): Promise<Map<string, StudentRiskLevel>> {
  const map = new Map<string, StudentRiskLevel>();
  for (const id of studentIds) map.set(id, "on_track");

  if (studentIds.length === 0) return map;

  const admin = createSupabaseAdmin();
  const { data: alerts } = await admin
    .from("learning_alerts")
    .select("student_id, severity")
    .eq("resolved", false)
    .in("student_id", studentIds);

  for (const alert of alerts ?? []) {
    const current = map.get(alert.student_id) ?? "on_track";
    if (alert.severity === "critical") {
      map.set(alert.student_id, "critical");
    } else if (
      (alert.severity === "high" || alert.severity === "medium") &&
      current !== "critical"
    ) {
      map.set(alert.student_id, "at_risk");
    }
  }

  return map;
}

export async function fetchAdminStudents(): Promise<AdminStudentsData> {
  const empty: AdminStudentsData = {
    students: [],
    cohorts: [],
    summary: { total: 0, onTrack: 0, atRisk: 0, critical: 0 },
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();

  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: users } = await admin
    .from("users")
    .select(
      "id, role, cohort_id, tokens_remaining, total_xp, level, last_login_date, created_at"
    )
    .order("created_at", { ascending: true });

  const userIds = (users ?? []).map((u) => u.id);
  const names = await resolveClerkDisplayNames(userIds);
  const riskMap = await computeRiskLevels(userIds);

  const { data: progressRows } = await admin
    .from("progress")
    .select("student_id, status, score")
    .in("student_id", userIds.length ? userIds : ["__none__"]);

  const cohortMap = new Map((cohorts ?? []).map((c) => [c.id, c.name]));

  const students: AdminStudentRow[] = (users ?? []).map((user) => {
    const profile = names.get(user.id);
    const userProgress = (progressRows ?? []).filter(
      (p) => p.student_id === user.id
    );
    const completed = userProgress.filter((p) => p.status === "completed");
    const scores = completed
      .map((p) => p.score)
      .filter((s): s is number => s != null);
    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    return {
      id: user.id,
      name: profile?.name ?? `User ${user.id.slice(-6)}`,
      email: profile?.email ?? null,
      imageUrl: profile?.imageUrl ?? null,
      cohortId: user.cohort_id,
      cohortName: user.cohort_id ? cohortMap.get(user.cohort_id) ?? null : null,
      role: user.role as UserRole,
      modulesDone: completed.length,
      modulesTotal: 10,
      averageScore,
      totalXp: user.total_xp ?? 0,
      level: user.level ?? "Rookie Builder",
      tokensRemaining: user.tokens_remaining,
      lastLogin: user.last_login_date,
      riskLevel: riskMap.get(user.id) ?? "on_track",
    };
  });

  const summary: AdminStudentsSummary = {
    total: students.filter((s) => s.role === "student").length,
    onTrack: students.filter(
      (s) => s.role === "student" && s.riskLevel === "on_track"
    ).length,
    atRisk: students.filter(
      (s) => s.role === "student" && s.riskLevel === "at_risk"
    ).length,
    critical: students.filter(
      (s) => s.role === "student" && s.riskLevel === "critical"
    ).length,
  };

  return {
    students,
    cohorts: (cohorts ?? []).map((c) => ({ id: c.id, name: c.name })),
    summary,
  };
}

export async function updateAdminStudent(input: {
  studentId: string;
  cohortId?: string | null;
  role?: UserRole;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();
  const updates: Record<string, unknown> = {};

  if (input.cohortId !== undefined) updates.cohort_id = input.cohortId;
  if (input.role !== undefined) updates.role = input.role;

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No updates provided" };
  }

  const { error } = await admin
    .from("users")
    .update(updates)
    .eq("id", input.studentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAdminStudent(
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("users").delete().eq("id", studentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function bulkUpdateStudentCohort(
  studentIds: string[],
  cohortId: string | null
): Promise<{ updated: number }> {
  if (!isSupabaseConfigured() || studentIds.length === 0) {
    return { updated: 0 };
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("users")
    .update({ cohort_id: cohortId })
    .in("id", studentIds)
    .select("id");

  return { updated: data?.length ?? 0 };
}

export async function bulkDeleteStudents(
  studentIds: string[]
): Promise<{ deleted: number }> {
  if (!isSupabaseConfigured() || studentIds.length === 0) {
    return { deleted: 0 };
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("users")
    .delete()
    .in("id", studentIds)
    .select("id");

  return { deleted: data?.length ?? 0 };
}
