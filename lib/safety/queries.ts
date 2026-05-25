import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { DbSafetyFlag, SafetySeverity } from "@/lib/safety/types";

async function resolveNames(ids: string[]) {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const clerk = await clerkClient();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const u = await clerk.users.getUser(id);
        map.set(
          id,
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.username ||
            id.slice(-6)
        );
      } catch {
        map.set(id, id.slice(-6));
      }
    })
  );
  return map;
}

export type SafetyOverview = {
  totalFlags: number;
  unreviewedFlags: number;
  criticalFlags: number;
  resolvedToday: number;
};

export async function fetchSafetyOverview(): Promise<SafetyOverview> {
  const empty = {
    totalFlags: 0,
    unreviewedFlags: 0,
    criticalFlags: 0,
    resolvedToday: 0,
  };
  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [all, unreviewed, critical, resolvedToday] = await Promise.all([
    admin.from("safety_flags").select("id", { count: "exact", head: true }),
    admin
      .from("safety_flags")
      .select("id", { count: "exact", head: true })
      .eq("reviewed", false)
      .eq("resolved", false),
    admin
      .from("safety_flags")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .eq("resolved", false),
    admin
      .from("safety_flags")
      .select("id", { count: "exact", head: true })
      .eq("resolved", true)
      .gte("created_at", today.toISOString()),
  ]);

  return {
    totalFlags: all.count ?? 0,
    unreviewedFlags: unreviewed.count ?? 0,
    criticalFlags: critical.count ?? 0,
    resolvedToday: resolvedToday.count ?? 0,
  };
}

export type SafetyFlagRow = DbSafetyFlag & { studentName: string };

export async function fetchSafetyFlags(filters?: {
  severity?: SafetySeverity | "all";
  unreviewedOnly?: boolean;
}): Promise<SafetyFlagRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  let query = admin
    .from("safety_flags")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters?.unreviewedOnly) {
    query = query.eq("reviewed", false).eq("resolved", false);
  }

  const { data } = await query;
  const studentIds = [
    ...new Set((data ?? []).map((f) => f.student_id).filter(Boolean)),
  ] as string[];
  const names = await resolveNames(studentIds);

  return (data ?? []).map((row) => ({
    ...row,
    details: (row.details as Record<string, unknown>) ?? {},
    studentName: row.student_id
      ? (names.get(row.student_id) ?? "Unknown")
      : "Unknown",
  }));
}

export async function fetchPlagiarismReport() {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("plagiarism_checks")
    .select(
      "id, submission_id, student_id, module_id, similarity_score, ai_generated_probability, flagged, checked_at"
    )
    .eq("flagged", true)
    .order("checked_at", { ascending: false })
    .limit(50);

  const studentIds = [
    ...new Set((data ?? []).map((r) => r.student_id).filter(Boolean)),
  ];
  const names = await resolveNames(studentIds);

  return (data ?? []).map((row) => ({
    ...row,
    studentName: names.get(row.student_id) ?? "Unknown",
  }));
}

export async function fetchContentFilters() {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("content_filters")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function fetchSessionAnalytics() {
  const empty = {
    avgSessionMinutes: 0,
    breakSuggestions: 0,
    longestSession: 0,
    totalSessionsToday: 0,
  };
  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await admin
    .from("session_logs")
    .select("active_minutes, break_suggested")
    .gte("session_start", today.toISOString());

  const sessions = data ?? [];
  if (sessions.length === 0) return empty;

  const totalActive = sessions.reduce((s, r) => s + (r.active_minutes ?? 0), 0);

  return {
    avgSessionMinutes: Math.round(totalActive / sessions.length),
    breakSuggestions: sessions.filter((s) => s.break_suggested).length,
    longestSession: Math.max(...sessions.map((s) => s.active_minutes ?? 0)),
    totalSessionsToday: sessions.length,
  };
}

export async function fetchTrainerSafetyFlags(): Promise<SafetyFlagRow[]> {
  return fetchSafetyFlags({
    unreviewedOnly: false,
  }).then((flags) =>
    flags.filter(
      (f) =>
        !f.resolved &&
        (f.severity === "high" ||
          f.severity === "critical" ||
          f.severity === "medium")
    )
  );
}

export async function updateSafetyFlag(
  flagId: string,
  updates: {
    reviewed?: boolean;
    resolved?: boolean;
    reviewedBy?: string;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("safety_flags")
    .update({
      reviewed: updates.reviewed,
      resolved: updates.resolved,
      reviewed_by: updates.reviewedBy,
    })
    .eq("id", flagId);

  return !error;
}

export function flagsToCsv(flags: SafetyFlagRow[]): string {
  const header =
    "id,student,flag_type,severity,source,reviewed,resolved,created_at";
  const rows = flags.map(
    (f) =>
      `${f.id},${f.studentName},${f.flag_type},${f.severity},${f.source},${f.reviewed},${f.resolved},${f.created_at}`
  );
  return [header, ...rows].join("\n");
}
