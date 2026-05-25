import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type {
  AlertSeverity,
  AlertType,
  LearningAlertRow,
} from "@/lib/ai/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function resolveClerkAvatars(
  userIds: string[]
): Promise<Map<string, { name: string; avatarUrl: string | null }>> {
  const map = new Map<string, { name: string; avatarUrl: string | null }>();
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
        map.set(id, { name, avatarUrl: user.imageUrl ?? null });
      } catch {
        map.set(id, { name: `Cadet ${id.slice(-6)}`, avatarUrl: null });
      }
    })
  );
  return map;
}

async function alertExistsRecently(
  studentId: string,
  alertType: AlertType,
  hours = 24
): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("learning_alerts")
    .select("id")
    .eq("student_id", studentId)
    .eq("alert_type", alertType)
    .eq("resolved", false)
    .gt("created_at", since)
    .maybeSingle();
  return Boolean(data);
}

async function createAlert(params: {
  studentId: string;
  trainerId: string | null;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  moduleId?: number | null;
}): Promise<boolean> {
  if (await alertExistsRecently(params.studentId, params.alertType)) {
    return false;
  }

  const admin = createSupabaseAdmin();
  await admin.from("learning_alerts").insert({
    student_id: params.studentId,
    trainer_id: params.trainerId,
    alert_type: params.alertType,
    severity: params.severity,
    message: params.message,
    module_id: params.moduleId ?? null,
  });

  if (params.trainerId) {
    await admin.from("notifications").insert({
      student_id: params.trainerId,
      type: "learning_alert",
      title: `⚠️ ${params.severity} alert`,
      message: params.message,
      module_id: params.moduleId ?? null,
    });
  }

  return true;
}

export async function runAlertChecks(trainerId?: string): Promise<{
  created: number;
}> {
  if (!isSupabaseConfigured()) return { created: 0 };

  const admin = createSupabaseAdmin();
  let created = 0;

  const { data: students } = await admin
    .from("users")
    .select("id, last_login_date")
    .eq("role", "student");

  for (const student of students ?? []) {
    const inactiveDays = daysSince(student.last_login_date) ?? 0;

    if (inactiveDays >= 14) {
      if (
        await createAlert({
          studentId: student.id,
          trainerId: trainerId ?? null,
          alertType: "inactive_14days",
          severity: "critical",
          message: `⚠️ ${student.id.slice(-6)} has not logged in for ${inactiveDays} days`,
        })
      ) {
        created++;
      }
    } else if (inactiveDays >= 7) {
      if (
        await createAlert({
          studentId: student.id,
          trainerId: trainerId ?? null,
          alertType: "inactive_7days",
          severity: "high",
          message: `⚠️ Student inactive for ${inactiveDays} days — check in soon`,
        })
      ) {
        created++;
      }
    } else if (inactiveDays >= 3) {
      if (
        await createAlert({
          studentId: student.id,
          trainerId: trainerId ?? null,
          alertType: "inactive_3days",
          severity: "medium",
          message: `Student has not logged in for ${inactiveDays} days`,
        })
      ) {
        created++;
      }
    }

    const { data: rejections } = await admin
      .from("submissions")
      .select("module_id")
      .eq("student_id", student.id)
      .eq("status", "rejected");

    const rejectionCounts = new Map<number, number>();
    for (const r of rejections ?? []) {
      rejectionCounts.set(
        r.module_id,
        (rejectionCounts.get(r.module_id) ?? 0) + 1
      );
    }

    for (const [moduleId, count] of rejectionCounts) {
      if (count >= 3) {
        if (
          await createAlert({
            studentId: student.id,
            trainerId: trainerId ?? null,
            alertType: "multiple_rejections",
            severity: "high",
            message: `⚠️ Student rejected ${count} times on Module ${moduleId}`,
            moduleId,
          })
        ) {
          created++;
        }
      } else if (count >= 2) {
        if (
          await createAlert({
            studentId: student.id,
            trainerId: trainerId ?? null,
            alertType: "multiple_rejections",
            severity: "medium",
            message: `⚠️ Student rejected twice on Module ${moduleId}`,
            moduleId,
          })
        ) {
          created++;
        }
      }
    }

    const { data: scoredSubs } = await admin
      .from("submissions")
      .select("score")
      .eq("student_id", student.id)
      .not("score", "is", null);

    const lowScores = (scoredSubs ?? []).filter(
      (s) => s.score != null && s.score < 60
    ).length;

    if (lowScores >= 2) {
      if (
        await createAlert({
          studentId: student.id,
          trainerId: trainerId ?? null,
          alertType: "low_score",
          severity: "medium",
          message: `Student has ${lowScores} submission scores below 60`,
        })
      ) {
        created++;
      }
    }

    const hasInactivity = inactiveDays >= 3;
    const hasMultipleRejections = [...rejectionCounts.values()].some(
      (c) => c >= 2
    );

    if (hasInactivity && hasMultipleRejections) {
      if (
        await createAlert({
          studentId: student.id,
          trainerId: trainerId ?? null,
          alertType: "at_risk",
          severity: "critical",
          message: `⚠️ Critical: inactive ${inactiveDays} days AND multiple rejections`,
        })
      ) {
        created++;
      }
    }
  }

  return { created };
}

export async function fetchLearningAlerts(
  includeResolved = false
): Promise<LearningAlertRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  let query = admin
    .from("learning_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!includeResolved) {
    query = query.eq("resolved", false);
  }

  const { data: alerts, error } = await query;
  if (error || !alerts?.length) return [];

  const studentIds = [...new Set(alerts.map((a) => a.student_id))];
  const profiles = await resolveClerkAvatars(studentIds);

  const { data: users } = await admin
    .from("users")
    .select("id, last_login_date")
    .in("id", studentIds);

  const loginByStudent = new Map(
    (users ?? []).map((u) => [u.id, u.last_login_date])
  );

  const { data: progressRows } = await admin
    .from("progress")
    .select("student_id, module_id, status, updated_at")
    .in("student_id", studentIds)
    .in("status", ["in_progress", "pending_review"]);

  const currentModuleByStudent = new Map<string, number>();
  for (const p of progressRows ?? []) {
    currentModuleByStudent.set(p.student_id, p.module_id);
  }

  const moduleIds = [
    ...new Set([
      ...alerts.map((a) => a.module_id).filter(Boolean),
      ...[...currentModuleByStudent.values()],
    ]),
  ] as number[];

  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .in("id", moduleIds.length ? moduleIds : [1]);

  const moduleTitle = new Map(
    (modules ?? []).map((m) => [m.id, m.title as string])
  );

  return alerts.map((alert) => {
    const profile = profiles.get(alert.student_id);
    const currentModuleId =
      currentModuleByStudent.get(alert.student_id) ?? null;

    return {
      id: alert.id,
      studentId: alert.student_id,
      studentName: profile?.name ?? `Cadet ${alert.student_id.slice(-6)}`,
      studentAvatarUrl: profile?.avatarUrl ?? null,
      trainerId: alert.trainer_id,
      alertType: alert.alert_type as AlertType,
      severity: alert.severity as AlertSeverity,
      message: alert.message,
      moduleId: alert.module_id,
      moduleTitle: alert.module_id
        ? (moduleTitle.get(alert.module_id) ?? null)
        : null,
      resolved: alert.resolved,
      createdAt: alert.created_at,
      daysSinceLogin: daysSince(loginByStudent.get(alert.student_id)),
      currentModuleId,
      currentModuleTitle: currentModuleId
        ? (moduleTitle.get(currentModuleId) ?? null)
        : null,
    };
  });
}

export async function resolveLearningAlert(
  alertId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database unavailable" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("learning_alerts")
    .update({ resolved: true })
    .eq("id", alertId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendStudentMessageFromTrainer(
  studentId: string,
  message: string,
  trainerName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database unavailable" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("notifications").insert({
    student_id: studentId,
    type: "trainer_message",
    title: `Message from ${trainerName}`,
    message,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
