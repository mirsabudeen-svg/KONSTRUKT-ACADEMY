"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  Lock,
  Play,
  Rocket,
  Sparkles,
} from "lucide-react";

import type { MissionModule } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const statusConfig = {
  locked: {
    ring: "border-zinc-600/50",
    bg: "bg-zinc-900/60",
    icon: Lock,
    iconClass: "text-zinc-500",
    label: "Locked",
  },
  available: {
    ring: "border-cyan-500/50",
    bg: "bg-cyan-500/10",
    icon: Sparkles,
    iconClass: "text-cyan-400",
    label: "Ready",
  },
  in_progress: {
    ring: "border-cyan-400 ring-2 ring-cyan-500/40",
    bg: "bg-cyan-500/15",
    icon: Play,
    iconClass: "text-cyan-300",
    label: "In Progress",
  },
  completed: {
    ring: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    icon: Check,
    iconClass: "text-emerald-400",
    label: "Complete",
  },
} as const;

type MissionTrackViewProps = {
  missions: MissionModule[];
  compact?: boolean;
  showHeader?: boolean;
  completedCount: number;
  total: number;
  percent: number;
};

export function MissionTrackView({
  missions,
  compact = false,
  showHeader = true,
  completedCount,
  total,
  percent,
}: MissionTrackViewProps) {
  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-500/80">
              Flight path
            </p>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {completedCount} / {total} missions complete
            </p>
          </div>
          <div className="min-w-[140px] flex-1 sm:max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1 text-right font-mono text-xs text-cyan-400/80">
              {percent}%
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative",
          compact
            ? "flex gap-3 overflow-x-auto pb-4 scrollbar-thin"
            : "grid gap-4 sm:grid-cols-2 xl:grid-cols-2"
        )}
      >
        {!compact && (
          <div
            className="pointer-events-none absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-cyan-500/40 via-violet-500/20 to-transparent xl:block"
            aria-hidden
          />
        )}

        {missions.map((mission, index) => (
          <MissionNode
            key={mission.id}
            mission={mission}
            index={index}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function MissionNode({
  mission,
  index,
  compact,
}: {
  mission: MissionModule;
  index: number;
  compact: boolean;
}) {
  const config = statusConfig[mission.displayStatus];
  const Icon = config.icon;
  const href = `/missions/${mission.id}`;
  const interactive = mission.unlocked;

  const content = (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className={cn(
        "relative flex gap-4 rounded-xl border p-4 transition-colors",
        config.ring,
        config.bg,
        compact && "min-w-[260px] shrink-0",
        interactive && "hover:border-cyan-400/60"
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg border font-display text-lg font-bold",
          config.ring,
          mission.displayStatus === "in_progress" &&
            "shadow-[0_0_24px_-4px] shadow-cyan-500/40"
        )}
      >
        {mission.displayStatus === "completed" ? (
          <Icon className={cn("size-6", config.iconClass)} aria-hidden />
        ) : (
          <span className="text-cyan-300/90">{mission.id}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Mission {mission.id}
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
              mission.displayStatus === "completed"
                ? "bg-emerald-500/20 text-emerald-300"
                : mission.displayStatus === "locked"
                  ? "bg-zinc-700/50 text-zinc-400"
                  : "bg-cyan-500/20 text-cyan-300"
            )}
          >
            {config.label}
          </span>
        </div>
        <h3 className="font-display mt-1 truncate font-semibold text-foreground">
          {mission.title}
        </h3>
        {!compact && mission.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {mission.description}
          </p>
        )}
        <p className="mt-2 text-xs text-violet-300/80">
          Badge: {mission.badge_name}
        </p>
        {mission.progress && mission.progress.score > 0 && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Score: {mission.progress.score}%
          </p>
        )}
      </div>

      {!interactive && (
        <Lock
          className="absolute right-4 top-4 size-4 text-zinc-600"
          aria-hidden
        />
      )}
    </motion.article>
  );

  if (!interactive) {
    return (
      <div className="cursor-not-allowed" title="Complete the previous mission first">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 rounded-xl">
      {content}
    </Link>
  );
}

export function ActiveMissionBanner({
  mission,
}: {
  mission: MissionModule | null;
}) {
  if (!mission) return null;

  return (
    <Link
      href={`/missions/${mission.id}`}
      className="group flex items-center gap-4 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-4 transition-colors hover:bg-cyan-500/15"
    >
      <Rocket className="size-8 text-cyan-400 transition-transform group-hover:scale-110" />
      <div>
        <p className="text-xs uppercase tracking-widest text-cyan-400/90">
          Current mission
        </p>
        <p className="font-display font-semibold">
          M{mission.id}: {mission.title}
        </p>
      </div>
    </Link>
  );
}
