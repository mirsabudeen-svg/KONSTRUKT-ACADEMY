"use client";

import type { ParentPortalData } from "@/lib/communications/parent-portal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function ParentPortalView({ data }: { data: ParentPortalData }) {
  const progressPct = Math.round(
    (data.completedModules / data.totalModules) * 100
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-background to-background" />

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <header className="mb-10 text-center">
          <p className="text-sm uppercase tracking-widest text-emerald-400/80">
            KONSTRUKT Academy — Parent Portal
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <Avatar className="size-20 ring-2 ring-emerald-500/40">
              {data.studentImageUrl ? (
                <AvatarImage src={data.studentImageUrl} alt={data.studentName} />
              ) : null}
              <AvatarFallback className="text-lg">
                {data.studentName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {data.studentName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          </div>
        </header>

        <section className="mb-8 rounded-xl border border-emerald-500/20 bg-card/50 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-emerald-200">
            Progress Overview
          </h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Completion" value={`${data.completedModules}/10`} />
            <Stat label="Avg Score" value={`${data.averageScore}%`} />
            <Stat
              label="Current Module"
              value={data.currentModule?.title ?? "—"}
            />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {progressPct}% complete
          </p>
        </section>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-emerald-500/20 bg-card/50 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-emerald-200">
              Recent Achievements
            </h2>
            <ul className="space-y-3">
              {data.recentAchievements.length === 0 ? (
                <li className="text-sm text-muted-foreground">No badges yet</li>
              ) : (
                data.recentAchievements.map((a) => (
                  <li
                    key={a.moduleId}
                    className="rounded-lg border border-emerald-500/10 bg-black/20 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      🏅 {a.badgeName} · Score {a.score ?? "—"} ·{" "}
                      {new Date(a.completedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-emerald-500/20 bg-card/50 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-emerald-200">
              Weekly Summary
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat
                label="Modules"
                value={String(data.weeklySummary.modulesCompleted)}
              />
              <MiniStat
                label="XP"
                value={String(data.weeklySummary.xpEarned)}
              />
              <MiniStat
                label="Streak"
                value={`${data.weeklySummary.streak}d`}
              />
            </div>
          </section>
        </div>

        <section className="mb-8 rounded-xl border border-emerald-500/20 bg-card/50 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-emerald-200">
            Mission Track
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.missionTrack.map((m) => (
              <Badge
                key={m.moduleId}
                className={
                  m.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : m.status === "in_progress" || m.status === "ready"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-zinc-500/20 text-zinc-400"
                }
              >
                M{m.moduleId}
              </Badge>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h2 className="mb-2 font-display text-lg font-semibold text-emerald-200">
            Next Steps
          </h2>
          <p className="text-sm">
            Currently working on:{" "}
            <strong>{data.nextSteps.currentModule}</strong>
          </p>
          {data.nextSteps.estimatedDays != null && (
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated completion in ~{data.nextSteps.estimatedDays} days at
              current pace
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-xl font-bold text-emerald-200">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}
