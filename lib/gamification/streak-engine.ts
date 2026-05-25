import "server-only";

import {
  awardXP,
} from "@/lib/gamification/xp-engine";
import { XP_REWARDS } from "@/lib/gamification/constants";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type StreakMilestone = {
  days: number;
  label: string;
  xp_bonus?: number;
  badge?: string;
};

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

export type RecordLoginResult = {
  streak: number;
  milestone_reached: boolean;
  milestone?: StreakMilestone;
  xp_awarded?: number;
};

const MILESTONES: StreakMilestone[] = [
  { days: 7, label: "7-Day Streak!", xp_bonus: XP_REWARDS.streak_7_days },
  { days: 14, label: "2-Week Warrior!" },
  { days: 30, label: "30-Day Legend!", xp_bonus: XP_REWARDS.streak_30_days, badge: "Streak Master" },
  { days: 60, label: "60-Day Champion!" },
  { days: 100, label: "100-Day Centurion!", badge: "Unstoppable" },
];

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function checkStreakMilestone(streak: number): StreakMilestone | null {
  return MILESTONES.find((m) => m.days === streak) ?? null;
}

export async function getStreak(studentId: string): Promise<StreakData | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();

  const { data: user } = await admin
    .from("users")
    .select("current_streak, longest_streak, last_login_date")
    .eq("id", studentId)
    .maybeSingle();

  if (!user) return null;

  const { data: streakRow } = await admin
    .from("streaks")
    .select("last_activity_date")
    .eq("student_id", studentId)
    .maybeSingle();

  return {
    current_streak: user.current_streak ?? 0,
    longest_streak: user.longest_streak ?? 0,
    last_activity_date:
      streakRow?.last_activity_date ?? user.last_login_date ?? null,
  };
}

export async function recordLogin(studentId: string): Promise<RecordLoginResult> {
  if (!isSupabaseConfigured()) {
    return { streak: 0, milestone_reached: false };
  }

  const admin = createSupabaseAdmin();
  const today = toDateString(new Date());

  const { data: user } = await admin
    .from("users")
    .select("current_streak, longest_streak, last_login_date")
    .eq("id", studentId)
    .maybeSingle();

  if (!user) {
    return { streak: 0, milestone_reached: false };
  }

  const lastLogin = user.last_login_date as string | null;
  let newStreak = user.current_streak ?? 0;
  let milestoneReached = false;
  let milestone: StreakMilestone | undefined;

  if (!lastLogin) {
    newStreak = 1;
  } else if (lastLogin === today) {
    newStreak = user.current_streak ?? 0;
  } else {
    const gap = daysBetween(lastLogin, today);
    if (gap === 1) {
      newStreak = (user.current_streak ?? 0) + 1;
    } else {
      newStreak = 1;
    }
  }

  const longestStreak = Math.max(user.longest_streak ?? 0, newStreak);

  await admin
    .from("users")
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_login_date: today,
    })
    .eq("id", studentId);

  await admin.from("streaks").upsert(
    {
      student_id: studentId,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" }
  );

  const hitMilestone = checkStreakMilestone(newStreak);
  let xpAwarded: number | undefined;

  if (hitMilestone && lastLogin !== today) {
    milestoneReached = true;
    milestone = hitMilestone;

    if (hitMilestone.xp_bonus) {
      const eventType =
        hitMilestone.days === 7 ? "streak_7_days" : "streak_30_days";
      await awardXP(
        studentId,
        eventType,
        hitMilestone.xp_bonus,
        undefined,
        hitMilestone.label
      );
      xpAwarded = hitMilestone.xp_bonus;
    }

    await admin.from("notifications").insert({
      student_id: studentId,
      type: "streak_bonus",
      title: `${hitMilestone.label} 🔥`,
      message: hitMilestone.badge
        ? `You earned the "${hitMilestone.badge}" badge!`
        : `Keep your streak going — ${newStreak} days strong!`,
      module_id: null,
    });
  }

  return {
    streak: newStreak,
    milestone_reached: milestoneReached,
    milestone,
    xp_awarded: xpAwarded,
  };
}
