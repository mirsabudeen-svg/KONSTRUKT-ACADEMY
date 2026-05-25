import "server-only";

import { requireTrainerContext } from "@/lib/supabase/trainer-actions";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { TOKEN_REFILL_AMOUNT } from "@/lib/trainer/constants";
import { reviewSubmission } from "@/lib/trainer/review";
import { clerkClient } from "@clerk/nextjs/server";

export type TrainerAnalyticsData = {
  studentsManaged: number;
  averageReviewTimeHours: number;
  approvalRate: number;
  rejectionRate: number;
  averageScoreGiven: number;
  tokensRefilledThisMonth: number;
  submissionsPerDay: { date: string; count: number }[];
  moduleCompletionRates: { moduleId: number; title: string; rate: number }[];
  scoreDistribution: { range: string; count: number }[];
  riskDistribution: { level: string; count: number }[];
  recentActivity: {
    id: string;
    message: string;
    createdAt: string;
  }[];
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchTrainerAnalytics(): Promise<TrainerAnalyticsData> {
  const empty: TrainerAnalyticsData = {
    studentsManaged: 0,
    averageReviewTimeHours: 0,
    approvalRate: 0,
    rejectionRate: 0,
    averageScoreGiven: 0,
    tokensRefilledThisMonth: 0,
    submissionsPerDay: [],
    moduleCompletionRates: [],
    scoreDistribution: [],
    riskDistribution: [],
    recentActivity: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const ctx = await requireTrainerContext();
  if ("error" in ctx) return empty;

  const admin = createSupabaseAdmin();

  const { data: students } = await admin
    .from("users")
    .select("id")
    .eq("role", "student");

  const studentIds = (students ?? []).map((s) => s.id);
  const studentsManaged = studentIds.length;

  const { data: reviewedSubs } = await admin
    .from("submissions")
    .select(
      "id, status, score, reviewed_at, submitted_at, opened_at, review_duration_minutes, student_id, module_id, feedback"
    )
    .in("student_id", studentIds.length ? studentIds : ["__none__"])
    .in("status", ["approved", "rejected"])
    .order("reviewed_at", { ascending: false });

  const reviewed = reviewedSubs ?? [];
  const approved = reviewed.filter((s) => s.status === "approved");
  const rejected = reviewed.filter((s) => s.status === "rejected");
  const totalReviewed = reviewed.length;

  const approvalRate =
    totalReviewed > 0 ? Math.round((approved.length / totalReviewed) * 100) : 0;
  const rejectionRate =
    totalReviewed > 0 ? Math.round((rejected.length / totalReviewed) * 100) : 0;

  const scores = approved
    .map((s) => s.score)
    .filter((s): s is number => s != null);
  const averageScoreGiven =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const durations = reviewed
    .map((s) => {
      if (s.review_duration_minutes != null) return s.review_duration_minutes;
      if (s.opened_at && s.reviewed_at) {
        return Math.round(
          (new Date(s.reviewed_at).getTime() -
            new Date(s.opened_at).getTime()) /
            60000
        );
      }
      if (s.submitted_at && s.reviewed_at) {
        return Math.round(
          (new Date(s.reviewed_at).getTime() -
            new Date(s.submitted_at).getTime()) /
            60000
        );
      }
      return null;
    })
    .filter((d): d is number => d != null && d >= 0);

  const averageReviewTimeHours =
    durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 60) * 10) / 10
      : 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: bulkMessageCount } = await admin
    .from("bulk_messages")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", ctx.userId)
    .gte("sent_at", monthStart.toISOString());

  const tokensRefilledThisMonth = (bulkMessageCount ?? 0) * TOKEN_REFILL_AMOUNT;

  const submissionsPerDay: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = daysAgoIso(i);
    const count = reviewed.filter(
      (s) => s.reviewed_at && s.reviewed_at.slice(0, 10) === date
    ).length;
    submissionsPerDay.push({ date, count });
  }

  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .order("sort_order", { ascending: true });

  const { data: progressRows } = await admin
    .from("progress")
    .select("module_id, status")
    .in("student_id", studentIds.length ? studentIds : ["__none__"]);

  const moduleCompletionRates = (modules ?? []).map((mod) => {
    const moduleProgress = (progressRows ?? []).filter(
      (p) => p.module_id === mod.id
    );
    const completed = moduleProgress.filter((p) => p.status === "completed").length;
    const rate =
      studentsManaged > 0
        ? Math.round((completed / studentsManaged) * 100)
        : 0;
    return { moduleId: mod.id, title: mod.title, rate };
  });

  const buckets = [
    { range: "0-59", min: 0, max: 59, count: 0 },
    { range: "60-69", min: 60, max: 69, count: 0 },
    { range: "70-79", min: 70, max: 79, count: 0 },
    { range: "80-89", min: 80, max: 89, count: 0 },
    { range: "90-100", min: 90, max: 100, count: 0 },
  ];

  for (const score of scores) {
    const bucket = buckets.find((b) => score >= b.min && score <= b.max);
    if (bucket) bucket.count++;
  }

  const { data: alerts } = await admin
    .from("learning_alerts")
    .select("severity")
    .eq("resolved", false)
    .in("student_id", studentIds.length ? studentIds : ["__none__"]);

  const riskCounts = { on_track: 0, at_risk: 0, critical: 0 };
  const alertedStudents = new Set((alerts ?? []).map((a) => a.severity));
  const criticalCount = (alerts ?? []).filter((a) => a.severity === "critical").length;
  const highCount = (alerts ?? []).filter(
    (a) => a.severity === "high" || a.severity === "medium"
  ).length;
  riskCounts.critical = criticalCount;
  riskCounts.at_risk = highCount;
  riskCounts.on_track = Math.max(0, studentsManaged - criticalCount - highCount);

  void alertedStudents;

  const recentActivity: TrainerAnalyticsData["recentActivity"] = [];

  for (const sub of reviewed.slice(0, 8)) {
    let studentName = `student ${sub.student_id.slice(-4)}`;
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(sub.student_id);
      studentName =
        user.firstName ??
        user.username ??
        studentName;
    } catch {
      /* ignore */
    }

    const ago = sub.reviewed_at
      ? formatRelativeTime(new Date(sub.reviewed_at))
      : "";

    if (sub.status === "approved") {
      recentActivity.push({
        id: sub.id,
        message: `Approved ${studentName} Module ${sub.module_id} — ${sub.score ?? "—"}/100 — ${ago}`,
        createdAt: sub.reviewed_at ?? "",
      });
    } else {
      const snippet = sub.feedback
        ? sub.feedback.slice(0, 40)
        : "Needs revision";
      recentActivity.push({
        id: sub.id,
        message: `Rejected ${studentName} Module ${sub.module_id} — ${snippet} — ${ago}`,
        createdAt: sub.reviewed_at ?? "",
      });
    }
  }

  const { data: bulkMsgs } = await admin
    .from("bulk_messages")
    .select("sent_at, message")
    .eq("trainer_id", ctx.userId)
    .order("sent_at", { ascending: false })
    .limit(3);

  for (const msg of bulkMsgs ?? []) {
    recentActivity.push({
      id: msg.sent_at,
      message: `Bulk message sent — ${msg.message.slice(0, 50)} — ${formatRelativeTime(new Date(msg.sent_at))}`,
      createdAt: msg.sent_at,
    });
  }

  recentActivity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    studentsManaged,
    averageReviewTimeHours,
    approvalRate,
    rejectionRate,
    averageScoreGiven,
    tokensRefilledThisMonth,
    submissionsPerDay,
    moduleCompletionRates,
    scoreDistribution: buckets.map(({ range, count }) => ({ range, count })),
    riskDistribution: [
      { level: "On track", count: riskCounts.on_track },
      { level: "At risk", count: riskCounts.at_risk },
      { level: "Critical", count: riskCounts.critical },
    ],
    recentActivity: recentActivity.slice(0, 10),
  };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function executeBulkAction(input: {
  action: "message" | "refill" | "approve" | "export";
  studentIds: string[];
  trainerId: string;
  payload?: { message?: string; title?: string; score?: number };
}): Promise<
  | { ok: true; result: unknown }
  | { ok: false; error: string; status: number }
> {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return { ok: false, error: ctx.error, status: ctx.status };
  }

  if (!input.studentIds.length) {
    return { ok: false, error: "No students selected", status: 400 };
  }

  const admin = createSupabaseAdmin();

  if (input.action === "message") {
    const message = input.payload?.message?.trim();
    const title = input.payload?.title?.trim() || "Message from your trainer";
    if (!message) {
      return { ok: false, error: "Message is required", status: 400 };
    }

    await admin.from("notifications").insert(
      input.studentIds.map((studentId) => ({
        student_id: studentId,
        type: "trainer_message",
        title,
        message,
      }))
    );

    const { data: trainer } = await admin
      .from("users")
      .select("cohort_id")
      .eq("id", input.trainerId)
      .maybeSingle();

    await admin.from("bulk_messages").insert({
      trainer_id: input.trainerId,
      cohort_id: trainer?.cohort_id ?? null,
      title,
      message,
    });

    return { ok: true, result: { sent: input.studentIds.length } };
  }

  if (input.action === "refill") {
    const { data: students } = await admin
      .from("users")
      .select("id, tokens_remaining")
      .in("id", input.studentIds)
      .eq("role", "student");

    for (const student of students ?? []) {
      await admin
        .from("users")
        .update({
          tokens_remaining: student.tokens_remaining + TOKEN_REFILL_AMOUNT,
        })
        .eq("id", student.id);
    }

    return {
      ok: true,
      result: { refilled: students?.length ?? 0, amount: TOKEN_REFILL_AMOUNT },
    };
  }

  if (input.action === "approve") {
    const score = input.payload?.score ?? 75;
    const { data: pending } = await admin
      .from("submissions")
      .select("id")
      .in("student_id", input.studentIds)
      .eq("status", "pending");

    let approved = 0;
    for (const sub of pending ?? []) {
      const result = await reviewSubmission({
        submissionId: sub.id,
        action: "approve",
        score,
      });
      if (result.ok) approved++;
    }

    return { ok: true, result: { approved } };
  }

  if (input.action === "export") {
    const profiles = new Map<string, { name: string; email: string | null }>();
    const clerk = await clerkClient();
    await Promise.all(
      input.studentIds.map(async (id) => {
        try {
          const user = await clerk.users.getUser(id);
          profiles.set(id, {
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.username ||
              id,
            email: user.emailAddresses[0]?.emailAddress ?? null,
          });
        } catch {
          profiles.set(id, { name: id, email: null });
        }
      })
    );

    const rows: string[][] = [
      [
        "name",
        "email",
        "modules_completed",
        "avg_score",
        "tokens",
        "last_login",
      ],
    ];

    for (const studentId of input.studentIds) {
      const { data: user } = await admin
        .from("users")
        .select("tokens_remaining, last_login_date")
        .eq("id", studentId)
        .maybeSingle();

      const { data: progress } = await admin
        .from("progress")
        .select("status, score")
        .eq("student_id", studentId);

      const completed = (progress ?? []).filter((p) => p.status === "completed");
      const scores = completed
        .map((p) => p.score)
        .filter((s): s is number => s != null);
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : "";

      const profile = profiles.get(studentId);
      rows.push([
        profile?.name ?? studentId,
        profile?.email ?? "",
        String(completed.length),
        String(avg),
        String(user?.tokens_remaining ?? 0),
        user?.last_login_date ?? "",
      ]);
    }

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    return { ok: true, result: { csv } };
  }

  return { ok: false, error: "Unknown action", status: 400 };
}

export { reviewSubmission };
