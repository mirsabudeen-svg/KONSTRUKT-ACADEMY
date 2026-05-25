import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Coins, Target, Trophy, Zap } from "lucide-react";

import { DailyBriefingCard } from "@/components/communications/daily-briefing-card";
import { XPBar } from "@/components/gamification/xp-bar";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { MissionTrack } from "@/components/progress/mission-track";
import { RecentActivity } from "@/components/progress/recent-activity";
import { isAdminRole } from "@/lib/auth/admin";
import { getUserRoleById } from "@/lib/auth/trainer";
import { getActiveChallengeCount } from "@/lib/gamification/challenges";
import { getStreak } from "@/lib/gamification/streak-engine";
import { getStudentXP } from "@/lib/gamification/xp-engine";
import { getRecentActivity } from "@/lib/progress/activity";
import { getMissionTrack } from "@/lib/progress/missions";
import {
  getCompletedCount,
  getRank,
  getTotalScore,
  MAX_TOTAL_SCORE,
  MODULE_COUNT,
} from "@/lib/progress/stats";
import { getTokensRemaining } from "@/lib/tokens";

export default async function DashboardPage() {
  const user = await currentUser();
  const { userId } = await auth();

  if (userId) {
    const role = await getUserRoleById(userId);
    if (isAdminRole(role)) {
      redirect("/admin");
    }
  }

  const firstName = user?.firstName ?? "Cadet";
  const track = await getMissionTrack();
  const { missions } = track;
  const completed = getCompletedCount(missions);
  const totalScore = getTotalScore(missions);
  const rank = getRank(completed);
  const tokens = await getTokensRemaining();
  const activity = await getRecentActivity();
  const xpData = userId ? await getStudentXP(userId) : null;
  const streakData = userId ? await getStreak(userId) : null;
  const activeChallenges = userId ? await getActiveChallengeCount(userId) : 0;

  return (
    <div className="space-y-8">
      <DailyBriefingCard />

      {xpData && (
        <div className="rounded-xl border border-cyan-500/20 bg-zinc-950/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <XPBar
                totalXp={xpData.total_xp}
                level={xpData.level}
                currentLevelMin={xpData.current_level_min}
                nextLevelMin={xpData.next_level_min}
                animate
              />
            </div>
            <StreakBadge streak={streakData?.current_streak ?? 0} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatPill
              label="Weekly XP"
              value={`${xpData.xp_this_week} XP`}
              icon={Zap}
            />
            <StatPill
              label="Active Challenges"
              value={String(activeChallenges)}
              icon={Target}
              href="/challenges"
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-500/80">
          Command Center
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {completed === 0
            ? "Your first mission is ready. Complete missions in order to unlock the next bay."
            : `${completed} of ${MODULE_COUNT} missions complete — keep climbing the track.`}
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-cyan-500/15 bg-zinc-950/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill
          label="Missions"
          value={`${completed}/${MODULE_COUNT}`}
          icon={Trophy}
        />
        <StatPill
          label="Score"
          value={`${totalScore}/${MAX_TOTAL_SCORE}`}
        />
        <StatPill label="Rank" value={rank} highlight />
        <StatPill label="Tokens" value={String(tokens)} icon={Coins} />
      </div>

      <MissionTrack missions={missions} />

      <RecentActivity items={activity} />

      {completed >= MODULE_COUNT && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="font-display text-lg font-semibold text-emerald-300">
            All missions complete!
          </p>
          <Link
            href="/certificate"
            className="mt-3 inline-block text-sm text-cyan-400 hover:underline"
          >
            View your graduation certificate →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
  highlight,
  href,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3">
      {Icon && <Icon className="size-4 text-cyan-400" aria-hidden />}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={`font-display text-sm font-semibold ${
            highlight ? "text-violet-300" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}
