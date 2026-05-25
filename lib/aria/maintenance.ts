import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { resolveClerkDisplayNames } from "@/lib/admin/clerk-names";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureStudentProfile } from "@/lib/user";

export type MaintenanceResult = {
  task_type: string;
  success: boolean;
  summary: string;
  details: Record<string, unknown>;
};

export async function runTokenAudit(): Promise<MaintenanceResult> {
  if (!isSupabaseConfigured()) {
    return {
      task_type: "token_audit",
      success: false,
      summary: "Supabase not configured",
      details: {},
    };
  }

  const admin = createSupabaseAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: students } = await admin
    .from("users")
    .select("id, tokens_remaining")
    .eq("role", "student");

  const zeroTokens = (students ?? []).filter((s) => s.tokens_remaining === 0);
  const lowTokens = (students ?? []).filter(
    (s) => s.tokens_remaining > 0 && s.tokens_remaining <= 2
  );

  const { data: usageLogs } = await admin
    .from("token_usage_log")
    .select("student_id, tokens_used")
    .gte("created_at", monthStart.toISOString());

  const usageByStudent = new Map<string, number>();
  for (const log of usageLogs ?? []) {
    usageByStudent.set(
      log.student_id,
      (usageByStudent.get(log.student_id) ?? 0) + (log.tokens_used ?? 0)
    );
  }

  const heavyUsers = [...usageByStudent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, tokens]) => ({ student_id: id, tokens_used: tokens }));

  const names = await resolveClerkDisplayNames([
    ...zeroTokens.map((s) => s.id),
    ...heavyUsers.map((u) => u.student_id),
  ]);

  return {
    task_type: "token_audit",
    success: true,
    summary: `${zeroTokens.length} at zero tokens, ${lowTokens.length} low, ${heavyUsers.length} heavy users this month`,
    details: {
      zero_tokens: zeroTokens.map((s) => ({
        id: s.id,
        name: names.get(s.id)?.name ?? s.id,
      })),
      low_tokens: lowTokens.length,
      heavy_users: heavyUsers.map((u) => ({
        ...u,
        name: names.get(u.student_id)?.name ?? u.student_id,
      })),
    },
  };
}

export async function runUserSync(): Promise<MaintenanceResult> {
  if (!isSupabaseConfigured()) {
    return {
      task_type: "user_sync",
      success: false,
      summary: "Supabase not configured",
      details: {},
    };
  }

  const admin = createSupabaseAdmin();
  const clerk = await clerkClient();

  const { data: supabaseUsers } = await admin.from("users").select("id");
  const supabaseIds = new Set((supabaseUsers ?? []).map((u) => u.id));

  const clerkUsers = await clerk.users.getUserList({ limit: 500 });
  const clerkIds = clerkUsers.data.map((u) => u.id);

  const missingInSupabase = clerkIds.filter((id) => !supabaseIds.has(id));
  const orphanedInSupabase = [...supabaseIds].filter(
    (id) => !clerkIds.includes(id)
  );

  let created = 0;
  for (const id of missingInSupabase.slice(0, 50)) {
    try {
      await ensureStudentProfile(id);
      created++;
    } catch (err) {
      console.error("[runUserSync] create", id, err);
    }
  }

  return {
    task_type: "user_sync",
    success: true,
    summary: `Created ${created} profiles. ${missingInSupabase.length} Clerk-only, ${orphanedInSupabase.length} Supabase-only`,
    details: {
      clerk_total: clerkIds.length,
      supabase_total: supabaseIds.size,
      missing_in_supabase: missingInSupabase,
      orphaned_in_supabase: orphanedInSupabase.slice(0, 20),
      profiles_created: created,
    },
  };
}

export async function runDatabaseCleanup(): Promise<MaintenanceResult> {
  if (!isSupabaseConfigured()) {
    return {
      task_type: "database_cleanup",
      success: false,
      summary: "Supabase not configured",
      details: {},
    };
  }

  const admin = createSupabaseAdmin();
  const sessionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const notificationCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const healthCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: sessionDeleted } = await admin
    .from("session_logs")
    .delete({ count: "exact" })
    .lt("session_start", sessionCutoff);

  const { count: notifDeleted } = await admin
    .from("notifications")
    .delete({ count: "exact" })
    .eq("read", true)
    .lt("created_at", notificationCutoff);

  const { count: healthDeleted } = await admin
    .from("system_health_logs")
    .delete({ count: "exact" })
    .lt("checked_at", healthCutoff);

  const total =
    (sessionDeleted ?? 0) + (notifDeleted ?? 0) + (healthDeleted ?? 0);

  return {
    task_type: "database_cleanup",
    success: true,
    summary: `Deleted ${total} rows (sessions: ${sessionDeleted ?? 0}, notifications: ${notifDeleted ?? 0}, health logs: ${healthDeleted ?? 0})`,
    details: {
      session_logs_deleted: sessionDeleted ?? 0,
      notifications_deleted: notifDeleted ?? 0,
      health_logs_deleted: healthDeleted ?? 0,
    },
  };
}

export async function runOrphanCheck(): Promise<MaintenanceResult> {
  if (!isSupabaseConfigured()) {
    return {
      task_type: "orphan_check",
      success: false,
      summary: "Supabase not configured",
      details: {},
    };
  }

  const admin = createSupabaseAdmin();

  const { data: userIds } = await admin.from("users").select("id");
  const validIds = new Set((userIds ?? []).map((u) => u.id));

  const { data: progressRows } = await admin.from("progress").select("student_id");
  const orphanProgress = (progressRows ?? []).filter(
    (p) => !validIds.has(p.student_id)
  ).length;

  const { data: submissions } = await admin
    .from("submissions")
    .select("id, progress_id");
  const { data: progressIds } = await admin.from("progress").select("id");
  const validProgress = new Set((progressIds ?? []).map((p) => p.id));
  const orphanSubmissions = (submissions ?? []).filter(
    (s) => s.progress_id && !validProgress.has(s.progress_id)
  ).length;

  const { data: notifications } = await admin
    .from("notifications")
    .select("student_id");
  const orphanNotifications = (notifications ?? []).filter(
    (n) => !validIds.has(n.student_id)
  ).length;

  return {
    task_type: "orphan_check",
    success: true,
    summary: `Found ${orphanProgress} orphan progress, ${orphanSubmissions} orphan submissions, ${orphanNotifications} orphan notifications`,
    details: {
      orphan_progress: orphanProgress,
      orphan_submissions: orphanSubmissions,
      orphan_notifications: orphanNotifications,
      note: "Report only — no records deleted",
    },
  };
}

export async function runMaintenanceTask(
  taskType: string
): Promise<MaintenanceResult> {
  switch (taskType) {
    case "token_audit":
      return runTokenAudit();
    case "user_sync":
      return runUserSync();
    case "database_cleanup":
      return runDatabaseCleanup();
    case "orphan_check":
      return runOrphanCheck();
    case "cache_clear":
      return {
        task_type: "cache_clear",
        success: true,
        summary: "No server-side cache configured — nothing to clear",
        details: {},
      };
    case "backup":
      return {
        task_type: "backup",
        success: true,
        summary: "Use Supabase Dashboard → Database → Backups for full backups",
        details: { recommendation: "Enable daily backups in Supabase project settings" },
      };
    default:
      return {
        task_type: taskType,
        success: false,
        summary: `Unknown task type: ${taskType}`,
        details: {},
      };
  }
}
