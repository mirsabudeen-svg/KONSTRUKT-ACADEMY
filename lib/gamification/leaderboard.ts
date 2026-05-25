import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import type { LeaderboardEntry } from "@/lib/gamification/types";

export type { LeaderboardEntry } from "@/lib/gamification/types";
export type LeaderboardPeriod = "week" | "all_time";

export async function getCohortLeaderboard(
  studentId: string,
  period: LeaderboardPeriod = "all_time"
): Promise<{ entries: LeaderboardEntry[]; cohortId: string | null }> {
  if (!isSupabaseConfigured()) {
    return { entries: [], cohortId: null };
  }

  const admin = createSupabaseAdmin();

  const { data: currentUser } = await admin
    .from("users")
    .select("cohort_id")
    .eq("id", studentId)
    .maybeSingle();

  const cohortId = currentUser?.cohort_id ?? null;
  if (!cohortId) return { entries: [], cohortId: null };

  const { data: students, error } = await admin
    .from("users")
    .select("id, total_xp, level, current_streak")
    .eq("cohort_id", cohortId)
    .eq("role", "student")
    .order("total_xp", { ascending: false });

  if (error || !students?.length) {
    return { entries: [], cohortId };
  }

  const xpByStudent: Record<string, number> = {};

  if (period === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: weekEvents } = await admin
      .from("xp_events")
      .select("student_id, xp_earned")
      .in(
        "student_id",
        students.map((s) => s.id)
      )
      .gte("created_at", weekAgo.toISOString());

    for (const ev of weekEvents ?? []) {
      xpByStudent[ev.student_id] =
        (xpByStudent[ev.student_id] ?? 0) + (ev.xp_earned ?? 0);
    }
  }

  const studentIds = students.map((s) => s.id);
  const { data: progressRows } = await admin
    .from("progress")
    .select("student_id, status")
    .in("student_id", studentIds)
    .eq("status", "completed");

  const modulesDone: Record<string, number> = {};
  for (const p of progressRows ?? []) {
    modulesDone[p.student_id] = (modulesDone[p.student_id] ?? 0) + 1;
  }

  const sorted = [...students].sort((a, b) => {
    const xpA =
      period === "week" ? (xpByStudent[a.id] ?? 0) : (a.total_xp ?? 0);
    const xpB =
      period === "week" ? (xpByStudent[b.id] ?? 0) : (b.total_xp ?? 0);
    return xpB - xpA;
  });

  const clerk = await clerkClient();
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    let name = "Cadet";
    let imageUrl: string | undefined;

    try {
      const clerkUser = await clerk.users.getUser(s.id);
      name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        "Cadet";
      imageUrl = clerkUser.imageUrl;
    } catch {
      name = `Cadet ${s.id.slice(-4)}`;
    }

    entries.push({
      id: s.id,
      total_xp:
        period === "week" ? (xpByStudent[s.id] ?? 0) : (s.total_xp ?? 0),
      level: s.level ?? "Rookie Builder",
      current_streak: s.current_streak ?? 0,
      modules_done: modulesDone[s.id] ?? 0,
      rank: i + 1,
      name,
      imageUrl,
    });
  }

  return { entries, cohortId };
}
