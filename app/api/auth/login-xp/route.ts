import { auth } from "@clerk/nextjs/server";

import { awardXP, XP_REWARDS } from "@/lib/gamification/xp-engine";
import { recordLogin } from "@/lib/gamification/streak-engine";
import { getStudentXP } from "@/lib/gamification/xp-engine";
import { getStreak } from "@/lib/gamification/streak-engine";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  userRateLimitKey,
} from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const rl = checkRateLimit(
    userRateLimitKey(userId, "login-xp"),
    RATE_LIMITS.loginXp.limit,
    RATE_LIMITS.loginXp.windowMs
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const streakResult = await recordLogin(userId);

  const admin = createSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayLoginXp } = await admin
    .from("xp_events")
    .select("*", { count: "exact", head: true })
    .eq("student_id", userId)
    .eq("event_type", "daily_login")
    .gte("created_at", todayStart.toISOString());

  let dailyXpAwarded = false;
  if (!todayLoginXp) {
    const xpResult = await awardXP(
      userId,
      "daily_login",
      XP_REWARDS.daily_login,
      undefined,
      "Daily login bonus"
    );
    dailyXpAwarded = xpResult != null;
  }

  const xp = await getStudentXP(userId);
  const streak = await getStreak(userId);

  return Response.json({
    streak: streakResult.streak,
    milestone_reached: streakResult.milestone_reached,
    milestone: streakResult.milestone,
    daily_xp_awarded: dailyXpAwarded,
    xp,
    streak_data: streak,
    xp_events: streakResult.xp_awarded
      ? [{ type: "streak_bonus", xp: streakResult.xp_awarded }]
      : dailyXpAwarded
        ? [{ type: "daily_login", xp: XP_REWARDS.daily_login }]
        : [],
  });
}
