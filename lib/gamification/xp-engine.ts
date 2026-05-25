import "server-only";

import {
  calculateLevel,
  getLevelBounds,
  XP_REWARDS,
  LEVELS,
  type LevelName,
  type XPEventType,
} from "@/lib/gamification/constants";
import type { StudentXPData } from "@/lib/gamification/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export { XP_REWARDS, LEVELS, calculateLevel, getLevelColor, formatEventLabel } from "@/lib/gamification/constants";
export type { LevelName, XPEventType };
export type { StudentXPData } from "@/lib/gamification/types";

export type XPEvent = {
  id: string;
  student_id: string;
  event_type: string;
  xp_earned: number;
  module_id: number | null;
  description: string | null;
  created_at: string;
};

export type AwardXPResult = {
  xp_earned: number;
  total_xp: number;
  level: string;
  leveled_up: boolean;
  previous_level?: string;
  new_level?: string;
};

export async function awardXP(
  studentId: string,
  eventType: XPEventType | string,
  xpEarned: number,
  moduleId?: number,
  description?: string
): Promise<AwardXPResult | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();

  const { data: user, error: userError } = await admin
    .from("users")
    .select("total_xp, level")
    .eq("id", studentId)
    .maybeSingle();

  if (userError || !user) {
    console.error("[awardXP] user fetch:", userError?.message);
    return null;
  }

  const previousLevel = user.level ?? calculateLevel(user.total_xp ?? 0);
  const previousXp = user.total_xp ?? 0;
  const newTotalXp = previousXp + xpEarned;
  const newLevel = calculateLevel(newTotalXp);
  const leveledUp = newLevel !== previousLevel;

  const { error: eventError } = await admin.from("xp_events").insert({
    student_id: studentId,
    event_type: eventType,
    xp_earned: xpEarned,
    module_id: moduleId ?? null,
    description: description ?? null,
  });

  if (eventError) {
    console.error("[awardXP] insert event:", eventError.message);
    return null;
  }

  const { error: updateError } = await admin
    .from("users")
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq("id", studentId);

  if (updateError) {
    console.error("[awardXP] update user:", updateError.message);
    return null;
  }

  if (leveledUp) {
    await admin.from("notifications").insert({
      student_id: studentId,
      type: "level_up",
      title: "Level Up! 🚀",
      message: `Congratulations! You've reached ${newLevel}. Keep building!`,
      module_id: moduleId ?? null,
    });
  }

  return {
    xp_earned: xpEarned,
    total_xp: newTotalXp,
    level: newLevel,
    leveled_up: leveledUp,
    previous_level: leveledUp ? previousLevel : undefined,
    new_level: leveledUp ? newLevel : undefined,
  };
}

export async function getStudentXP(studentId: string): Promise<StudentXPData | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();

  const { data: user, error } = await admin
    .from("users")
    .select("total_xp, level")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !user) return null;

  const totalXp = user.total_xp ?? 0;
  const level = user.level ?? calculateLevel(totalXp);
  const bounds = getLevelBounds(level);
  const xpToNext = bounds.nextMin != null ? bounds.nextMin - totalXp : 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: weekEvents } = await admin
    .from("xp_events")
    .select("xp_earned")
    .eq("student_id", studentId)
    .gte("created_at", weekAgo.toISOString());

  const xpThisWeek = (weekEvents ?? []).reduce(
    (sum, e) => sum + (e.xp_earned ?? 0),
    0
  );

  return {
    total_xp: totalXp,
    level,
    xp_to_next_level: Math.max(0, xpToNext),
    xp_this_week: xpThisWeek,
    current_level_min: bounds.min,
    next_level_min: bounds.nextMin,
  };
}

export async function getXPHistory(
  studentId: string,
  limit = 20
): Promise<XPEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from("xp_events")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getXPHistory]", error.message);
    return [];
  }

  return (data ?? []) as XPEvent[];
}
