import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import {
  ensurePortalTokenFresh,
  getStudentDisplayName,
  logPortalView,
} from "@/lib/communications/utils";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type ParentPortalData = {
  studentName: string;
  studentImageUrl: string | null;
  lastUpdated: string;
  completedModules: number;
  totalModules: number;
  averageScore: number;
  currentModule: {
    id: number;
    title: string;
    status: string;
  } | null;
  recentAchievements: {
    moduleId: number;
    title: string;
    badgeName: string;
    score: number | null;
    completedAt: string;
  }[];
  weeklySummary: {
    modulesCompleted: number;
    xpEarned: number;
    streak: number;
  };
  missionTrack: {
    moduleId: number;
    title: string;
    status: string;
  }[];
  nextSteps: {
    currentModule: string;
    estimatedDays: number | null;
  };
};

export async function fetchParentPortalByToken(
  token: string
): Promise<ParentPortalData | null> {
  if (!isSupabaseConfigured() || !token) return null;

  const admin = createSupabaseAdmin();
  const { data: contact } = await admin
    .from("parent_contacts")
    .select("id, student_id, portal_token, portal_token_created_at")
    .eq("portal_token", token)
    .maybeSingle();

  if (!contact) return null;

  const freshToken = await ensurePortalTokenFresh(
    contact.id,
    contact.portal_token,
    contact.portal_token_created_at
  );

  if (freshToken !== token) {
    return fetchParentPortalByToken(freshToken);
  }

  await logPortalView(token, contact.id, "overview");

  const studentId = contact.student_id;
  const studentName = await getStudentDisplayName(studentId);

  let studentImageUrl: string | null = null;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(studentId);
    studentImageUrl = user.imageUrl ?? null;
  } catch {
    /* ignore */
  }

  const { data: userRow } = await admin
    .from("users")
    .select("current_streak, total_xp, updated_at")
    .eq("id", studentId)
    .maybeSingle();

  const { data: modules } = await admin
    .from("modules")
    .select("id, title, badge_name, sort_order")
    .order("sort_order", { ascending: true });

  const { data: progress } = await admin
    .from("progress")
    .select("module_id, status, score, updated_at")
    .eq("student_id", studentId);

  const progressMap = new Map(
    (progress ?? []).map((p) => [p.module_id, p])
  );

  const completed = (progress ?? []).filter((p) => p.status === "completed");
  const scores = completed
    .map((p) => p.score)
    .filter((s): s is number => s != null);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const currentProgress =
    (progress ?? []).find(
      (p) =>
        p.status === "in_progress" ||
        p.status === "ready" ||
        p.status === "pending_review"
    ) ?? null;

  let currentModule: ParentPortalData["currentModule"] = null;
  if (currentProgress) {
    const mod = (modules ?? []).find(
      (m) => m.id === currentProgress.module_id
    );
    currentModule = {
      id: currentProgress.module_id,
      title: mod?.title ?? `Module ${currentProgress.module_id}`,
      status: currentProgress.status,
    };
  }

  const recentAchievements = completed
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 5)
    .map((p) => {
      const mod = (modules ?? []).find((m) => m.id === p.module_id);
      return {
        moduleId: p.module_id,
        title: mod?.title ?? `Module ${p.module_id}`,
        badgeName: mod?.badge_name ?? "Badge",
        score: p.score,
        completedAt: p.updated_at,
      };
    });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const modulesCompletedThisWeek = completed.filter(
    (p) => new Date(p.updated_at) >= weekStart
  ).length;

  const { data: weekXp } = await admin
    .from("xp_events")
    .select("xp_earned")
    .eq("student_id", studentId)
    .gte("created_at", weekStart.toISOString());

  const xpEarned = (weekXp ?? []).reduce(
    (sum, e) => sum + (e.xp_earned ?? 0),
    0
  );

  const missionTrack = (modules ?? []).map((mod) => ({
    moduleId: mod.id,
    title: mod.title,
    status: progressMap.get(mod.id)?.status ?? "locked",
  }));

  let estimatedDays: number | null = null;
  if (completed.length >= 2) {
    const sorted = [...completed].sort(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );
    const first = new Date(sorted[0].updated_at);
    const last = new Date(sorted[sorted.length - 1].updated_at);
    const daysSpan = Math.max(
      1,
      (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pace = completed.length / daysSpan;
    const remaining = 10 - completed.length;
    estimatedDays = pace > 0 ? Math.ceil(remaining / pace) : null;
  }

  return {
    studentName,
    studentImageUrl,
    lastUpdated: new Date().toISOString(),
    completedModules: completed.length,
    totalModules: 10,
    averageScore,
    currentModule,
    recentAchievements,
    weeklySummary: {
      modulesCompleted: modulesCompletedThisWeek,
      xpEarned,
      streak: userRow?.current_streak ?? 0,
    },
    missionTrack,
    nextSteps: {
      currentModule:
        currentModule?.title ??
        (completed.length >= 10
          ? "Graduation complete!"
          : "Launch Sequence"),
      estimatedDays,
    },
  };
}
