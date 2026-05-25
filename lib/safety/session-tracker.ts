import "server-only";

import { awardXP } from "@/lib/gamification/xp-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchSafetySettings } from "@/lib/safety/settings";
import type { SessionHealth } from "@/lib/safety/types";

export async function startSession(
  studentId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("session_logs")
    .insert({ student_id: studentId })
    .select("id")
    .single();

  if (error) {
    console.error("[startSession]", error.message);
    return null;
  }

  return data.id;
}

export async function updateSession(
  sessionId: string,
  activity: {
    activeMinutes?: number;
    idleMinutes?: number;
    page?: string;
    action?: boolean;
  }
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("session_logs")
    .select("active_minutes, idle_minutes, pages_visited, actions_count")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return;

  const pages = (session.pages_visited as string[]) ?? [];
  if (activity.page && !pages.includes(activity.page)) {
    pages.push(activity.page);
  }

  await admin
    .from("session_logs")
    .update({
      active_minutes: activity.activeMinutes ?? session.active_minutes,
      idle_minutes: activity.idleMinutes ?? session.idle_minutes,
      pages_visited: pages.slice(-50),
      actions_count:
        session.actions_count + (activity.action ? 1 : 0),
    })
    .eq("id", sessionId);
}

export async function checkSessionHealth(
  sessionId: string
): Promise<SessionHealth> {
  const settings = await fetchSafetySettings();
  const empty: SessionHealth = {
    needs_break: false,
    needs_hint: false,
    message: null,
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("session_logs")
    .select("active_minutes, idle_minutes, break_suggested")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return empty;

  if (
    session.active_minutes >= settings.sessionBreakMinutes &&
    !session.break_suggested
  ) {
    await admin
      .from("session_logs")
      .update({ break_suggested: true })
      .eq("id", sessionId);

    return {
      needs_break: true,
      needs_hint: false,
      message:
        "You've been learning for a while — take a 10 minute break to keep your brain fresh!",
    };
  }

  if (session.idle_minutes >= settings.idleDetectionMinutes) {
    return {
      needs_break: false,
      needs_hint: true,
      message:
        "Still there? Pick a mission and keep building — your trainer is cheering you on!",
    };
  }

  return empty;
}

export async function endSession(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdmin();
  const { data: session } = await admin
    .from("session_logs")
    .select("student_id, active_minutes")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return;

  await admin
    .from("session_logs")
    .update({ session_end: new Date().toISOString() })
    .eq("id", sessionId);

  if (session.active_minutes >= 30) {
    await awardXP(
      session.student_id,
      "productive_session",
      15,
      undefined,
      "Productive learning session"
    );
  }
}

export async function getTodayLearningMinutes(
  studentId: string
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("session_logs")
    .select("active_minutes")
    .eq("student_id", studentId)
    .gte("session_start", today.toISOString());

  return (data ?? []).reduce((s, r) => s + (r.active_minutes ?? 0), 0);
}
