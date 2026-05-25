"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

import { getLevelColor } from "@/lib/gamification/constants";
import { cn } from "@/lib/utils";

type XPBarProps = {
  totalXp: number;
  level: string;
  currentLevelMin: number;
  nextLevelMin: number | null;
  compact?: boolean;
  animate?: boolean;
  className?: string;
};

export function XPBar({
  totalXp,
  level,
  currentLevelMin,
  nextLevelMin,
  compact = false,
  animate = false,
  className,
}: XPBarProps) {
  const rangeMax = nextLevelMin ?? currentLevelMin + 100;
  const rangeMin = currentLevelMin;
  const progress =
    nextLevelMin != null
      ? Math.min(100, ((totalXp - rangeMin) / (rangeMax - rangeMin)) * 100)
      : 100;

  const levelColor = getLevelColor(level);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            levelColor,
            compact && "text-[9px]"
          )}
        >
          {level}
        </span>
        {!compact && nextLevelMin != null && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {totalXp} / {nextLevelMin} XP
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-zinc-800/80",
          compact ? "h-1.5" : "h-2.5"
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500",
            animate && "shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          )}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {animate && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white/20"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </div>
      {compact && (
        <p className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
          <Zap className="size-2.5 text-cyan-400" aria-hidden />
          {totalXp} XP
        </p>
      )}
    </div>
  );
}
