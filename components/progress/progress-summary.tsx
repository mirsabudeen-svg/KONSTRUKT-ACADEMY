"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Coins, Target } from "lucide-react";

import type { MissionModule } from "@/lib/db/types";
import {
  getNextBadge,
  MAX_TOTAL_SCORE,
  MODULE_COUNT,
} from "@/lib/progress/stats";
import { cn } from "@/lib/utils";

type ProgressSummaryProps = {
  missions: MissionModule[];
  completedCount: number;
  totalScore: number;
  tokens: number;
  compact?: boolean;
};

function ProgressRing({
  completed,
  total,
  size = 72,
}: {
  completed: number;
  total: number;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-zinc-800"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ProgressSummary({
  missions,
  completedCount,
  totalScore,
  tokens,
  compact = false,
}: ProgressSummaryProps) {
  const activeMission =
    missions.find(
      (m) =>
        m.unlocked &&
        m.displayStatus !== "completed" &&
        m.displayStatus !== "locked"
    ) ?? missions.find((m) => m.displayStatus === "locked");
  const nextBadge = getNextBadge(missions);

  if (compact) {
    return (
      <div className="rounded-xl border border-cyan-500/15 bg-zinc-950/60 p-3">
        <div className="flex items-center gap-3">
          <div className="relative flex shrink-0 items-center justify-center">
            <ProgressRing completed={completedCount} total={MODULE_COUNT} size={56} />
            <span className="absolute font-mono text-[10px] font-bold text-cyan-300">
              {completedCount}/{MODULE_COUNT}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">Current</p>
            <p className="truncate text-sm font-medium text-foreground">
              {activeMission?.title ?? "Complete"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-zinc-950/80 to-cyan-950/20 p-4">
      <div className="flex items-start gap-4">
        <div className="relative flex shrink-0 items-center justify-center">
          <ProgressRing completed={completedCount} total={MODULE_COUNT} />
          <span className="absolute font-mono text-xs font-bold text-cyan-300">
            {completedCount}/{MODULE_COUNT}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-cyan-500/70">
              Current Module
            </p>
            <p className="truncate font-display text-sm font-semibold text-foreground">
              {activeMission
                ? `M${activeMission.id}: ${activeMission.title}`
                : "All missions complete!"}
            </p>
          </div>

          {nextBadge && nextBadge.displayStatus !== "completed" && (
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 size-3.5 shrink-0 text-violet-400" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-violet-400/70">
                  Next Badge
                </p>
                <p className="truncate text-xs text-violet-200">
                  {nextBadge.badge_name}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Coins className="size-3.5 text-amber-400" aria-hidden />
            <span className="font-mono text-xs text-amber-200">
              {tokens} tokens
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-xs text-muted-foreground">
              {totalScore}/{MAX_TOTAL_SCORE} pts
            </span>
          </div>
        </div>
      </div>

      <Link
        href="/badges"
        className={cn(
          "mt-3 block text-center text-[10px] uppercase tracking-widest text-cyan-400/80 transition-colors hover:text-cyan-300"
        )}
      >
        View badges →
      </Link>
    </div>
  );
}
