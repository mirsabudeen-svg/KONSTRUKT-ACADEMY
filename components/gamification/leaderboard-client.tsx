"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Medal } from "lucide-react";

import { LevelBadge } from "@/components/gamification/level-badge";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LeaderboardEntry } from "@/lib/gamification/types";
import { cn } from "@/lib/utils";

type LeaderboardClientProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  period: "week" | "all_time";
};

export function LeaderboardClient({
  entries,
  currentUserId,
  period,
}: LeaderboardClientProps) {
  const [anonymous, setAnonymous] = useState(false);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const displayName = (entry: LeaderboardEntry) => {
    if (entry.id === currentUserId && anonymous) return "You";
    return entry.name;
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-cyan-500/20 p-1">
          <Link
            href="/leaderboard?period=week"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-white/5",
              period === "week" && "bg-cyan-500/20 text-cyan-300"
            )}
          >
            This Week
          </Link>
          <Link
            href="/leaderboard"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-white/5",
              period === "all_time" && "bg-cyan-500/20 text-cyan-300"
            )}
          >
            All Time
          </Link>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="rounded border-cyan-500/30"
          />
          Anonymous mode
        </label>
      </div>

      {podium.length > 0 && (
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-end">
          {[1, 0, 2].map((idx) => {
            const entry = podium[idx];
            if (!entry) return <div key={idx} />;
            const rank = entry.rank;
            const isFirst = rank === 1;
            const isCurrent = entry.id === currentUserId;

            return (
              <div
                key={entry.id}
                className={cn(
                  "relative rounded-xl border p-5 text-center transition-all",
                  isFirst
                    ? "order-2 border-amber-500/40 bg-amber-500/10 md:scale-105"
                    : rank === 2
                      ? "order-1 border-zinc-400/30 bg-zinc-500/10"
                      : "order-3 border-orange-700/30 bg-orange-900/10",
                  isCurrent && "ring-2 ring-cyan-500/50"
                )}
              >
                {isFirst && (
                  <Crown
                    className="mx-auto mb-2 size-8 text-amber-400"
                    aria-hidden
                  />
                )}
                {!isFirst && (
                  <Medal
                    className={cn(
                      "mx-auto mb-2 size-6",
                      rank === 2 ? "text-zinc-300" : "text-orange-600"
                    )}
                    aria-hidden
                  />
                )}
                <Avatar className="mx-auto size-14">
                  <AvatarImage src={entry.imageUrl} alt="" />
                  <AvatarFallback>{initials(entry.name)}</AvatarFallback>
                </Avatar>
                <p className="mt-3 font-display font-semibold">
                  {displayName(entry)}
                </p>
                <p className="font-mono text-lg font-bold text-cyan-300">
                  {entry.total_xp} XP
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <LevelBadge level={entry.level} size="sm" />
                  <StreakBadge streak={entry.current_streak} size="sm" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  #{rank} · {entry.modules_done} modules
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {rest.map((entry) => {
          const isCurrent = entry.id === currentUserId;
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-4 rounded-lg border border-white/5 bg-zinc-950/50 px-4 py-3",
                isCurrent && "border-cyan-500/40 bg-cyan-500/10"
              )}
            >
              <span className="w-8 font-mono text-sm text-muted-foreground">
                #{entry.rank}
              </span>
              <Avatar className="size-9">
                <AvatarImage src={entry.imageUrl} alt="" />
                <AvatarFallback className="text-xs">
                  {initials(entry.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{displayName(entry)}</p>
                <LevelBadge level={entry.level} size="sm" />
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-cyan-300">
                  {entry.total_xp} XP
                </p>
                <StreakBadge streak={entry.current_streak} size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-muted-foreground">
          No cohort members on the leaderboard yet.
        </p>
      )}
    </div>
  );
}
