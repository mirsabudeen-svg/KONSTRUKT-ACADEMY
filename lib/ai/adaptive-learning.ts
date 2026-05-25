import "server-only";

import type { AlertSeverity, AlertType, StudentRiskAssessment } from "@/lib/ai/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function analyzeStudentProgress(
  studentId: string
): Promise<StudentRiskAssessment> {
  if (!isSupabaseConfigured()) {
    return {
      risk_level: "on_track",
      risk_factors: [],
      recommendations: [],
      suggested_actions: [],
    };
  }

  const admin = createSupabaseAdmin();
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  const suggestedActions: string[] = [];

  const { data: user } = await admin
    .from("users")
    .select("last_login_date, current_streak, total_xp")
    .eq("id", studentId)
    .maybeSingle();

  const { data: submissions } = await admin
    .from("submissions")
    .select("status, score, module_id, submitted_at")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: true });

  const { data: progress } = await admin
    .from("progress")
    .select("module_id, status, score, updated_at")
    .eq("student_id", studentId);

  const { data: conversations } = await admin
    .from("tutor_conversations")
    .select("id")
    .eq("student_id", studentId);

  const convIds = (conversations ?? []).map((c) => c.id);
  let tutorQuestionCount = 0;
  if (convIds.length > 0) {
    const { count } = await admin
      .from("tutor_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .in("conversation_id", convIds);
    tutorQuestionCount = count ?? 0;
  }

  const rejectedByModule = new Map<number, number>();
  const scores: number[] = [];
  let lowScoreCount = 0;

  for (const sub of submissions ?? []) {
    if (sub.status === "rejected") {
      rejectedByModule.set(
        sub.module_id,
        (rejectedByModule.get(sub.module_id) ?? 0) + 1
      );
    }
    if (sub.score != null) {
      scores.push(sub.score);
      if (sub.score < 60) lowScoreCount++;
    }
  }

  let inactiveDays = 0;
  if (user?.last_login_date) {
    const lastLogin = new Date(user.last_login_date);
    inactiveDays = Math.floor(
      (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (inactiveDays >= 7) {
      riskFactors.push(`No login for ${inactiveDays} days`);
      recommendations.push("Reach out to check if they need help getting back in");
      suggestedActions.push("Send a welcome-back message");
    } else if (inactiveDays >= 3) {
      riskFactors.push(`Inactive for ${inactiveDays} days`);
      recommendations.push("Send an encouraging check-in");
    }
  }

  for (const [moduleId, count] of rejectedByModule) {
    if (count >= 2) {
      riskFactors.push(`${count} rejections on Module ${moduleId}`);
      recommendations.push(`Review Module ${moduleId} concepts with the student`);
      suggestedActions.push(`Schedule a 1:1 on Module ${moduleId}`);
    }
  }

  if (lowScoreCount >= 2) {
    riskFactors.push(`${lowScoreCount} scores below 60`);
    recommendations.push("Focus on fundamentals before advancing");
    suggestedActions.push("Assign a review challenge");
  }

  const inProgress = (progress ?? []).filter(
    (p) => p.status === "in_progress"
  );
  for (const p of inProgress) {
    const daysOnModule = Math.floor(
      (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOnModule >= 5) {
      riskFactors.push(`Stuck on Module ${p.module_id} for ${daysOnModule} days`);
    }
  }

  if (scores.length >= 2) {
    const recent = scores.slice(-3);
    const older = scores.slice(0, -3);
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg < olderAvg - 15) {
        riskFactors.push("Submission scores declining over time");
        recommendations.push("Identify which concepts are causing difficulty");
      } else if (recentAvg > olderAvg + 10) {
        recommendations.push("Student is improving — consider a stretch challenge");
      }
    }
  }

  const xpEvents = await admin
    .from("xp_events")
    .select("xp_earned, created_at")
    .eq("student_id", studentId)
    .gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  const weeklyXp = (xpEvents.data ?? []).reduce(
    (sum, e) => sum + (e.xp_earned ?? 0),
    0
  );
  if (weeklyXp === 0 && inactiveDays < 3) {
    riskFactors.push("No XP earned in the last 7 days");
    recommendations.push("Encourage daily mission activity");
  }

  if ((tutorQuestionCount ?? 0) > 20) {
    recommendations.push(
      "Student asks many tutor questions — may need more structured guidance"
    );
  }

  let riskLevel: StudentRiskAssessment["risk_level"] = "on_track";
  if (
    riskFactors.some(
      (f) => f.includes("7 days") || f.includes("3 rejections")
    ) ||
    (inactiveDays >= 7 && rejectedByModule.size > 0)
  ) {
    riskLevel = "critical";
  } else if (riskFactors.length >= 2) {
    riskLevel = "at_risk";
  } else if (riskFactors.length === 1) {
    riskLevel = "at_risk";
  }

  return {
    risk_level: riskLevel,
    risk_factors: riskFactors,
    recommendations,
    suggested_actions: suggestedActions,
  };
}

export async function generateLearningAlert(
  studentId: string,
  riskData: StudentRiskAssessment,
  trainerId?: string | null
): Promise<void> {
  if (!isSupabaseConfigured() || riskData.risk_level === "on_track") return;

  const admin = createSupabaseAdmin();

  const alertType: AlertType =
    riskData.risk_level === "critical" ? "at_risk" : "low_score";
  const severity: AlertSeverity =
    riskData.risk_level === "critical" ? "critical" : "high";

  const message = riskData.risk_factors.join(". ");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await admin
    .from("learning_alerts")
    .select("id")
    .eq("student_id", studentId)
    .eq("alert_type", alertType)
    .eq("resolved", false)
    .gt("created_at", oneDayAgo)
    .maybeSingle();

  if (existing) return;

  const { data: currentProgress } = await admin
    .from("progress")
    .select("module_id")
    .eq("student_id", studentId)
    .in("status", ["in_progress", "pending_review"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("learning_alerts").insert({
    student_id: studentId,
    trainer_id: trainerId ?? null,
    alert_type: alertType,
    severity,
    message: `⚠️ At-risk student: ${message}`,
    module_id: currentProgress?.module_id ?? null,
  });

  if (trainerId) {
    await admin.from("notifications").insert({
      student_id: trainerId,
      type: "learning_alert",
      title: "Student at risk",
      message: `A student needs attention: ${message}`,
      module_id: currentProgress?.module_id ?? null,
    });
  }
}
