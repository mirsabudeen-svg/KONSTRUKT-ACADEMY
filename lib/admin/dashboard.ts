import "server-only";

import { resolveClerkDisplayNames } from "@/lib/admin/clerk-names";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminDashboardData = {
  totalStudents: number;
  activeToday: number;
  pendingSubmissions: number;
  tokensUsed: number;
  moduleCompletion: { moduleId: number; title: string; rate: number }[];
  riskDistribution: { level: string; count: number }[];
  recentActivity: { id: string; message: string; createdAt: string }[];
  systemAlerts: {
    id: string;
    severity: string;
    message: string;
    studentId: string;
    createdAt: string;
  }[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const empty: AdminDashboardData = {
    totalStudents: 0,
    activeToday: 0,
    pendingSubmissions: 0,
    tokensUsed: 0,
    moduleCompletion: [],
    riskDistribution: [],
    recentActivity: [],
    systemAlerts: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const today = todayIso();

  const { data: students } = await admin
    .from("users")
    .select("id, last_login_date")
    .eq("role", "student");

  const studentIds = (students ?? []).map((s) => s.id);
  const totalStudents = studentIds.length;
  const activeToday = (students ?? []).filter(
    (s) => s.last_login_date === today
  ).length;

  const { count: pendingCount } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: tokenLogs } = await admin
    .from("token_usage_log")
    .select("tokens_used")
    .gte("created_at", monthStart.toISOString());

  const tokensUsed = (tokenLogs ?? []).reduce(
    (sum, row) => sum + (row.tokens_used ?? 0),
    0
  );

  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .order("sort_order", { ascending: true });

  const { data: progressRows } = await admin
    .from("progress")
    .select("module_id, status, student_id")
    .in("student_id", studentIds.length ? studentIds : ["__none__"]);

  const moduleCompletion = (modules ?? []).map((mod) => {
    const completed = (progressRows ?? []).filter(
      (p) => p.module_id === mod.id && p.status === "completed"
    ).length;
    const rate =
      totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;
    return { moduleId: mod.id, title: mod.title, rate };
  });

  const { data: alerts } = await admin
    .from("learning_alerts")
    .select("id, severity, message, student_id, created_at")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const riskCounts = { "On Track": 0, "At Risk": 0, Critical: 0 };
  const studentRisk = new Map<string, "on_track" | "at_risk" | "critical">();

  for (const sid of studentIds) {
    studentRisk.set(sid, "on_track");
  }

  for (const alert of alerts ?? []) {
    const current = studentRisk.get(alert.student_id) ?? "on_track";
    if (alert.severity === "critical") {
      studentRisk.set(alert.student_id, "critical");
    } else if (
      (alert.severity === "high" || alert.severity === "medium") &&
      current !== "critical"
    ) {
      studentRisk.set(alert.student_id, "at_risk");
    }
  }

  for (const level of studentRisk.values()) {
    if (level === "critical") riskCounts.Critical++;
    else if (level === "at_risk") riskCounts["At Risk"]++;
    else riskCounts["On Track"]++;
  }

  const riskDistribution = Object.entries(riskCounts).map(([level, count]) => ({
    level,
    count,
  }));

  const { data: recentSubs } = await admin
    .from("submissions")
    .select("id, student_id, module_id, status, submitted_at, reviewed_at")
    .order("submitted_at", { ascending: false })
    .limit(12);

  const activityIds = [
    ...new Set((recentSubs ?? []).map((s) => s.student_id)),
  ];
  const names = await resolveClerkDisplayNames(activityIds);

  const recentActivity = (recentSubs ?? []).slice(0, 20).map((sub) => {
    const profile = names.get(sub.student_id);
    const studentName = profile?.name ?? `Student ${sub.student_id.slice(-4)}`;
    const ts = sub.reviewed_at ?? sub.submitted_at;
    return {
      id: sub.id,
      message: `${sub.status === "pending" ? "Submitted" : sub.status === "approved" ? "Approved" : "Rejected"} — ${studentName} · Module ${sub.module_id}`,
      createdAt: ts,
    };
  });

  const systemAlerts = (alerts ?? []).map((a) => ({
    id: a.id,
    severity: a.severity,
    message: a.message,
    studentId: a.student_id,
    createdAt: a.created_at,
  }));

  void upsertDailyPlatformStats({
    activeStudents: activeToday,
    totalSubmissions: pendingCount ?? 0,
    tokensUsed,
    tutorConversations: 0,
    avgScore: 0,
  });

  return {
    totalStudents,
    activeToday,
    pendingSubmissions: pendingCount ?? 0,
    tokensUsed,
    moduleCompletion,
    riskDistribution,
    recentActivity,
    systemAlerts,
  };
}

async function upsertDailyPlatformStats(input: {
  activeStudents: number;
  totalSubmissions: number;
  tokensUsed: number;
  tutorConversations: number;
  avgScore: number;
}): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    const today = todayIso();

    const { count: approvalCount } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: rejectionCount } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected");

    const { count: tutorCount } = await admin
      .from("tutor_conversations")
      .select("id", { count: "exact", head: true });

    const { data: approvedScores } = await admin
      .from("submissions")
      .select("score")
      .eq("status", "approved")
      .not("score", "is", null);

    const scores = (approvedScores ?? [])
      .map((s) => s.score)
      .filter((s): s is number => s != null);
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    await admin.from("platform_stats").upsert(
      {
        stat_date: today,
        active_students: input.activeStudents,
        total_submissions: input.totalSubmissions,
        total_approvals: approvalCount ?? 0,
        total_rejections: rejectionCount ?? 0,
        tokens_used: input.tokensUsed,
        tutor_conversations: tutorCount ?? 0,
        avg_score: Math.round(avgScore * 10) / 10,
      },
      { onConflict: "stat_date" }
    );
  } catch (err) {
    console.error("[upsertDailyPlatformStats]", err);
  }
}
