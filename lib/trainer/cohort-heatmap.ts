import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { ProgressStatus } from "@/lib/db/types";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type CohortHeatmapCell = {
  moduleId: number;
  moduleTitle: string;
  status: ProgressStatus | "locked";
  score: number | null;
  updatedAt: string | null;
};

export type CohortHeatmapStudent = {
  studentId: string;
  studentName: string;
  studentAvatarUrl: string | null;
  email: string | null;
  cells: CohortHeatmapCell[];
};

export type CohortHeatmapData = {
  students: CohortHeatmapStudent[];
  modules: { id: number; title: string }[];
};

async function resolveClerkProfiles(
  userIds: string[]
): Promise<
  Map<string, { name: string; avatarUrl: string | null; email: string | null }>
> {
  const map = new Map<
    string,
    { name: string; avatarUrl: string | null; email: string | null }
  >();
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
          avatarUrl: user.imageUrl ?? null,
          email: user.emailAddresses[0]?.emailAddress ?? null,
        });
      } catch {
        map.set(id, {
          name: `Cadet ${id.slice(-6)}`,
          avatarUrl: null,
          email: null,
        });
      }
    })
  );
  return map;
}

export async function fetchCohortHeatmapData(): Promise<CohortHeatmapData> {
  if (!isSupabaseConfigured()) {
    return { students: [], modules: [] };
  }

  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return { students: [], modules: [] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { students: [], modules: [] };

  const { data: modules } = await supabase
    .from("modules")
    .select("id, title")
    .order("sort_order", { ascending: true });

  const moduleList = modules ?? [];
  const moduleTitleById = new Map(
    moduleList.map((m) => [m.id, m.title as string])
  );

  const { data: students } = await supabase
    .from("users")
    .select("id, cohort_id")
    .eq("role", "student")
    .order("created_at", { ascending: true });

  if (!students?.length) {
    return {
      students: [],
      modules: moduleList.map((m) => ({ id: m.id, title: m.title })),
    };
  }

  const studentIds = students.map((s) => s.id);
  const profiles = await resolveClerkProfiles(studentIds);

  const { data: progressRows } = await supabase
    .from("progress")
    .select("student_id, module_id, status, score, updated_at")
    .in("student_id", studentIds);

  const progressByStudent = new Map<
    string,
    Map<number, { status: ProgressStatus; score: number | null; updatedAt: string }>
  >();

  for (const row of progressRows ?? []) {
    if (!progressByStudent.has(row.student_id)) {
      progressByStudent.set(row.student_id, new Map());
    }
    progressByStudent.get(row.student_id)!.set(row.module_id, {
      status: row.status as ProgressStatus,
      score: row.score,
      updatedAt: row.updated_at,
    });
  }

  const heatmapStudents: CohortHeatmapStudent[] = students.map((student) => {
    const profile = profiles.get(student.id);
    const progressMap = progressByStudent.get(student.id) ?? new Map();

    const cells: CohortHeatmapCell[] = moduleList.map((mod) => {
      const progress = progressMap.get(mod.id);
      return {
        moduleId: mod.id,
        moduleTitle: moduleTitleById.get(mod.id) ?? `Mission ${mod.id}`,
        status: progress?.status ?? "locked",
        score: progress?.score ?? null,
        updatedAt: progress?.updatedAt ?? null,
      };
    });

    return {
      studentId: student.id,
      studentName: profile?.name ?? `Cadet ${student.id.slice(-6)}`,
      studentAvatarUrl: profile?.avatarUrl ?? null,
      email: profile?.email ?? null,
      cells,
    };
  });

  return {
    students: heatmapStudents,
    modules: moduleList.map((m) => ({ id: m.id, title: m.title })),
  };
}
