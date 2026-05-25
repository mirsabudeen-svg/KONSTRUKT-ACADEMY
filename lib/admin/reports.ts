import "server-only";

import { rowsToCsv } from "@/lib/admin/csv";
import { resolveClerkDisplayNames } from "@/lib/admin/clerk-names";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type ReportType =
  | "student_progress"
  | "trainer_activity"
  | "token_economy"
  | "cohort_performance"
  | "ai_usage";

export type ReportRequest = {
  reportType: ReportType;
  dateRange?: { start: string; end: string };
  cohortId?: string | null;
};

function inDateRange(
  isoDate: string,
  range?: { start: string; end: string }
): boolean {
  if (!range) return true;
  const d = isoDate.slice(0, 10);
  return d >= range.start && d <= range.end;
}

export async function generateAdminReport(
  input: ReportRequest
): Promise<{ csv: string; filename: string }> {
  if (!isSupabaseConfigured()) {
    return { csv: "No data", filename: "report.csv" };
  }

  const admin = createSupabaseAdmin();

  switch (input.reportType) {
    case "student_progress":
      return generateStudentProgressReport(admin, input);
    case "trainer_activity":
      return generateTrainerActivityReport(admin, input);
    case "token_economy":
      return generateTokenEconomyReport(admin, input);
    case "cohort_performance":
      return generateCohortPerformanceReport(admin, input);
    case "ai_usage":
      return generateAiUsageReport(admin, input);
    default:
      return { csv: "Unknown report type", filename: "report.csv" };
  }
}

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

async function generateStudentProgressReport(
  admin: AdminClient,
  input: ReportRequest
): Promise<{ csv: string; filename: string }> {
  let query = admin
    .from("users")
    .select("id, cohort_id")
    .eq("role", "student");

  if (input.cohortId) {
    query = query.eq("cohort_id", input.cohortId);
  }

  const { data: students } = await query;
  const studentIds = (students ?? []).map((s) => s.id);
  const names = await resolveClerkDisplayNames(studentIds);

  const { data: progress } = await admin
    .from("progress")
    .select("student_id, module_id, status, score, updated_at")
    .in("student_id", studentIds.length ? studentIds : ["__none__"]);

  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .order("sort_order");

  const rows: (string | number | null)[][] = [];

  for (const student of students ?? []) {
    const profile = names.get(student.id);
    for (const mod of modules ?? []) {
      const p = (progress ?? []).find(
        (row) => row.student_id === student.id && row.module_id === mod.id
      );
      if (p && inDateRange(p.updated_at, input.dateRange)) {
        rows.push([
          profile?.name ?? student.id,
          profile?.email ?? "",
          mod.id,
          mod.title,
          p.status,
          p.score,
          p.updated_at.slice(0, 10),
        ]);
      } else if (!input.dateRange) {
        rows.push([
          profile?.name ?? student.id,
          profile?.email ?? "",
          mod.id,
          mod.title,
          p?.status ?? "locked",
          p?.score ?? "",
          p?.updated_at?.slice(0, 10) ?? "",
        ]);
      }
    }
  }

  return {
    csv: rowsToCsv(
      ["Student", "Email", "Module ID", "Module", "Status", "Score", "Updated"],
      rows
    ),
    filename: "student-progress-report.csv",
  };
}

async function generateTrainerActivityReport(
  admin: AdminClient,
  input: ReportRequest
): Promise<{ csv: string; filename: string }> {
  const { data: subs } = await admin
    .from("submissions")
    .select(
      "reviewed_by, status, score, submitted_at, reviewed_at, review_duration_minutes, opened_at"
    )
    .not("reviewed_by", "is", null)
    .in("status", ["approved", "rejected"]);

  const trainerStats = new Map<
    string,
    { reviewed: number; approved: number; totalMinutes: number }
  >();

  for (const sub of subs ?? []) {
    if (!sub.reviewed_by || !inDateRange(sub.reviewed_at ?? "", input.dateRange)) {
      continue;
    }
    const stats = trainerStats.get(sub.reviewed_by) ?? {
      reviewed: 0,
      approved: 0,
      totalMinutes: 0,
    };
    stats.reviewed++;
    if (sub.status === "approved") stats.approved++;
    if (sub.review_duration_minutes != null) {
      stats.totalMinutes += sub.review_duration_minutes;
    } else if (sub.opened_at && sub.reviewed_at) {
      stats.totalMinutes += Math.round(
        (new Date(sub.reviewed_at).getTime() -
          new Date(sub.opened_at).getTime()) /
          60000
      );
    }
    trainerStats.set(sub.reviewed_by, stats);
  }

  const trainerIds = [...trainerStats.keys()];
  const names = await resolveClerkDisplayNames(trainerIds);

  const rows = trainerIds.map((id) => {
    const stats = trainerStats.get(id)!;
    const approvalRate =
      stats.reviewed > 0
        ? Math.round((stats.approved / stats.reviewed) * 100)
        : 0;
    const avgMinutes =
      stats.reviewed > 0
        ? Math.round(stats.totalMinutes / stats.reviewed)
        : 0;
    return [
      names.get(id)?.name ?? id,
      stats.reviewed,
      avgMinutes,
      `${approvalRate}%`,
    ];
  });

  return {
    csv: rowsToCsv(
      ["Trainer", "Reviews Done", "Avg Review Minutes", "Approval Rate"],
      rows
    ),
    filename: "trainer-activity-report.csv",
  };
}

async function generateTokenEconomyReport(
  admin: AdminClient,
  input: ReportRequest
): Promise<{ csv: string; filename: string }> {
  const { data: logs } = await admin
    .from("token_usage_log")
    .select("student_id, usage_type, tokens_used, module_id, created_at")
    .order("created_at", { ascending: false });

  const studentIds = [...new Set((logs ?? []).map((l) => l.student_id))];
  const names = await resolveClerkDisplayNames(studentIds);

  const rows = (logs ?? [])
    .filter((l) => inDateRange(l.created_at, input.dateRange))
    .map((l) => [
      names.get(l.student_id)?.name ?? l.student_id,
      l.usage_type,
      l.tokens_used,
      l.module_id ?? "",
      l.created_at.slice(0, 10),
    ]);

  return {
    csv: rowsToCsv(
      ["Student", "Usage Type", "Tokens", "Module ID", "Date"],
      rows
    ),
    filename: "token-economy-report.csv",
  };
}

async function generateCohortPerformanceReport(
  admin: AdminClient,
  _input: ReportRequest
): Promise<{ csv: string; filename: string }> {
  const { data: cohorts } = await admin.from("cohorts").select("id, name");
  const { data: students } = await admin
    .from("users")
    .select("id, cohort_id")
    .eq("role", "student");
  const { data: progress } = await admin
    .from("progress")
    .select("student_id, module_id, status")
    .eq("status", "completed");

  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .order("sort_order");

  const rows: (string | number)[][] = [];

  for (const cohort of cohorts ?? []) {
    const cohortStudents = (students ?? []).filter(
      (s) => s.cohort_id === cohort.id
    );
    for (const mod of modules ?? []) {
      const completed = cohortStudents.filter((s) =>
        (progress ?? []).some(
          (p) =>
            p.student_id === s.id &&
            p.module_id === mod.id &&
            p.status === "completed"
        )
      ).length;
      const rate =
        cohortStudents.length > 0
          ? Math.round((completed / cohortStudents.length) * 100)
          : 0;
      rows.push([cohort.name, mod.id, mod.title, `${rate}%`, completed]);
    }
  }

  return {
    csv: rowsToCsv(
      ["Cohort", "Module ID", "Module", "Completion Rate", "Students Completed"],
      rows
    ),
    filename: "cohort-performance-report.csv",
  };
}

async function generateAiUsageReport(
  admin: AdminClient,
  input: ReportRequest
): Promise<{ csv: string; filename: string }> {
  const { count: conversationCount } = await admin
    .from("tutor_conversations")
    .select("id", { count: "exact", head: true });

  const { count: reviewCount } = await admin
    .from("code_reviews")
    .select("id", { count: "exact", head: true });

  const { data: messages } = await admin
    .from("tutor_messages")
    .select("content, role, created_at")
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(100);

  const filtered = (messages ?? []).filter((m) =>
    inDateRange(m.created_at, input.dateRange)
  );

  const summaryRows: (string | number)[][] = [
    ["Tutor Conversations", conversationCount ?? 0],
    ["Code Reviews", reviewCount ?? 0],
    ["", ""],
    ["Recent Student Questions", ""],
  ];

  const questionRows = filtered.slice(0, 50).map((m) => [
    m.content.slice(0, 120),
    m.created_at.slice(0, 10),
  ]);

  return {
    csv: rowsToCsv(
      ["Metric", "Value"],
      [...summaryRows, ...questionRows]
    ),
    filename: "ai-usage-report.csv",
  };
}
