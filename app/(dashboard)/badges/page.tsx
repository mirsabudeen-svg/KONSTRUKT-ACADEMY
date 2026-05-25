import { getMissionTrack } from "@/lib/progress/missions";
import {
  getActivityStreak,
  getCompletedCount,
  getRank,
  getTotalScore,
  MAX_TOTAL_SCORE,
  MODULE_COUNT,
} from "@/lib/progress/stats";
import { BadgeCard } from "@/components/progress/badge-card";
import { NoBadges } from "@/components/empty/empty-state";

export default async function BadgesPage() {
  const { missions } = await getMissionTrack();
  const earnedCount = getCompletedCount(missions);
  const totalScore = getTotalScore(missions);
  const rank = getRank(earnedCount);
  const streak = getActivityStreak(missions);
  const percent = Math.round((earnedCount / MODULE_COUNT) * 100);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-500/80">
          Achievements
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">My Badges</h1>
        <p className="mt-2 text-muted-foreground">
          {earnedCount} / {MODULE_COUNT} badges earned
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Collection progress</span>
          <span className="font-mono text-cyan-400">{percent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {missions.map((mission) => {
          const earned = mission.displayStatus === "completed";
          return (
            <BadgeCard
              key={mission.id}
              badge_name={mission.badge_name}
              module_title={mission.title}
              module_id={mission.id}
              earned={earned}
              earned_at={mission.progress?.updated_at}
              score={mission.progress?.score}
            />
          );
        })}
      </div>

      {earnedCount === 0 && (
        <NoBadges />
      )}

      <section className="rounded-2xl border border-cyan-500/15 bg-card/40 p-6 backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold text-cyan-200">
          Stats
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Score"
            value={`${totalScore} / ${MAX_TOTAL_SCORE}`}
          />
          <StatCard
            label="Missions Completed"
            value={`${earnedCount} / ${MODULE_COUNT}`}
          />
          <StatCard label="Current Streak" value={`${streak} days`} />
          <StatCard label="Rank" value={rank} highlight />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={`font-display mt-2 text-lg font-semibold ${
          highlight ? "text-violet-300" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
