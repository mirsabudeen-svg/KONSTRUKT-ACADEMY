import "server-only";

import { awardXP, XP_REWARDS } from "@/lib/gamification/xp-engine";
import {
  sendCertificateNotification,
  sendModuleCompleteNotification,
} from "@/lib/communications/whatsapp";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const MAX_MODULE_ID = 10;

export type ReviewAction = "approve" | "reject";

export type ReviewSubmissionInput = {
  submissionId: string;
  action: ReviewAction;
  feedback?: string;
  score?: number;
};

export type ReviewSubmissionResult =
  | {
      ok: true;
      action: ReviewAction;
      nextModuleUnlocked: boolean;
      nextModuleId: number | null;
    }
  | { ok: false; error: string; status: number };

export async function reviewSubmission(
  input: ReviewSubmissionInput
): Promise<ReviewSubmissionResult> {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return { ok: false, error: ctx.error, status: ctx.status };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const { submissionId, action, feedback = "", score } = input;

  if (!submissionId?.trim()) {
    return { ok: false, error: "submission_id is required", status: 400 };
  }

  if (action === "reject" && !feedback.trim()) {
    return { ok: false, error: "Feedback is required when rejecting", status: 400 };
  }

  if (action === "approve") {
    if (score == null || !Number.isInteger(score) || score < 0 || score > 100) {
      return {
        ok: false,
        error: "Score 0–100 is required when approving",
        status: 400,
      };
    }
  }

  const admin = createSupabaseAdmin();

  const { data: submission, error: fetchError } = await admin
    .from("submissions")
    .select("id, student_id, module_id, status, opened_at, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (fetchError || !submission) {
    return { ok: false, error: "Submission not found", status: 404 };
  }

  if (submission.status !== "pending") {
    return {
      ok: false,
      error: "Submission has already been reviewed",
      status: 409,
    };
  }

  const studentId = submission.student_id;
  const moduleId = submission.module_id;

  const { data: moduleRow } = await admin
    .from("modules")
    .select("title, badge_name")
    .eq("id", moduleId)
    .maybeSingle();

  const moduleTitle = moduleRow?.title ?? `Mission ${moduleId}`;
  const trimmedFeedback = feedback.trim();
  const now = new Date().toISOString();

  const reviewDurationMinutes = (() => {
    const start = submission.opened_at ?? submission.submitted_at;
    if (!start) return null;
    return Math.max(
      0,
      Math.round(
        (new Date(now).getTime() - new Date(start).getTime()) / 60000
      )
    );
  })();

  if (action === "approve") {
    const { error: subError } = await admin
      .from("submissions")
      .update({
        status: "approved",
        feedback: trimmedFeedback || null,
        score,
        reviewed_at: now,
        reviewed_by: ctx.userId,
        review_duration_minutes: reviewDurationMinutes,
      })
      .eq("id", submissionId);

    if (subError) {
      console.error("[reviewSubmission] submission approve", subError.message);
      return { ok: false, error: subError.message, status: 500 };
    }

    const { error: progressError } = await admin
      .from("progress")
      .update({ status: "completed", score })
      .eq("student_id", studentId)
      .eq("module_id", moduleId);

    if (progressError) {
      console.error("[reviewSubmission] progress complete", progressError.message);
      return { ok: false, error: progressError.message, status: 500 };
    }

    const nextModuleId = moduleId + 1;
    let nextModuleUnlocked = false;
    let nextModuleTitle: string | null = null;

    if (nextModuleId <= MAX_MODULE_ID) {
      const { data: nextModule } = await admin
        .from("modules")
        .select("title")
        .eq("id", nextModuleId)
        .maybeSingle();

      nextModuleTitle = nextModule?.title ?? `Mission ${nextModuleId}`;

      const { data: existingProgress } = await admin
        .from("progress")
        .select("status")
        .eq("student_id", studentId)
        .eq("module_id", nextModuleId)
        .maybeSingle();

      if (existingProgress) {
        const { error: unlockError } = await admin
          .from("progress")
          .update({ status: "ready" })
          .eq("student_id", studentId)
          .eq("module_id", nextModuleId);

        if (!unlockError) nextModuleUnlocked = true;
      } else {
        const { error: insertError } = await admin.from("progress").insert({
          student_id: studentId,
          module_id: nextModuleId,
          status: "ready",
        });

        if (!insertError) nextModuleUnlocked = true;
      }
    }

    const scoreText = `${score}/100`;
    const feedbackSuffix = trimmedFeedback ? ` ${trimmedFeedback}` : "";

    await admin.from("notifications").insert({
      student_id: studentId,
      type: "approved",
      title: "Mission Approved! 🎉",
      message: `Your submission for ${moduleTitle} was approved. Score: ${scoreText}.${feedbackSuffix}`,
      module_id: moduleId,
    });

    if (nextModuleUnlocked && nextModuleTitle) {
      await admin.from("notifications").insert({
        student_id: studentId,
        type: "unlocked",
        title: "New Mission Unlocked! 🔓",
        message: `${nextModuleTitle} is now available. Ready for your next challenge?`,
        module_id: nextModuleId,
      });
    }

    await awardXP(studentId, "module_completed", XP_REWARDS.module_completed, moduleId);

    if (score != null && score >= 90) {
      await awardXP(
        studentId,
        "high_score_bonus",
        XP_REWARDS.high_score_bonus,
        moduleId,
        `Score of ${score}/100 — Excellence bonus!`
      );
    }

    const { count: rejectedCount } = await admin
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("module_id", moduleId)
      .eq("status", "rejected");

    if (!rejectedCount) {
      await awardXP(
        studentId,
        "first_attempt_approval",
        XP_REWARDS.first_attempt_approval,
        moduleId,
        "First attempt approved!"
      );
    }

    void sendModuleCompleteNotification(
      studentId,
      moduleTitle,
      score ?? 0,
      moduleRow?.badge_name ?? "Badge"
    );
    if (moduleId === MAX_MODULE_ID) {
      void sendCertificateNotification(studentId);
    }

    return {
      ok: true,
      action: "approve",
      nextModuleUnlocked,
      nextModuleId: nextModuleUnlocked ? nextModuleId : null,
    };
  }

  const { error: subError } = await admin
    .from("submissions")
    .update({
      status: "rejected",
      feedback: trimmedFeedback,
      reviewed_at: now,
      reviewed_by: ctx.userId,
      review_duration_minutes: reviewDurationMinutes,
    })
    .eq("id", submissionId);

  if (subError) {
    console.error("[reviewSubmission] submission reject", subError.message);
    return { ok: false, error: subError.message, status: 500 };
  }

  const { error: progressError } = await admin
    .from("progress")
    .update({ status: "in_progress" })
    .eq("student_id", studentId)
    .eq("module_id", moduleId);

  if (progressError) {
    console.error("[reviewSubmission] progress reject", progressError.message);
    return { ok: false, error: progressError.message, status: 500 };
  }

  await admin.from("notifications").insert({
    student_id: studentId,
    type: "rejected",
    title: "Mission Needs Revision 📝",
    message: `Your submission for ${moduleTitle} needs revision. Trainer feedback: ${trimmedFeedback}`,
    module_id: moduleId,
  });

  return {
    ok: true,
    action: "reject",
    nextModuleUnlocked: false,
    nextModuleId: null,
  };
}
