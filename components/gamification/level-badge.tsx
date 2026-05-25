"use client";

import { getLevelColor } from "@/lib/gamification/constants";
import { cn } from "@/lib/utils";

type LevelBadgeProps = {
  level: string;
  className?: string;
  size?: "sm" | "md";
};

export function LevelBadge({ level, className, size = "md" }: LevelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wider",
        getLevelColor(level),
        size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        className
      )}
    >
      {level}
    </span>
  );
}
