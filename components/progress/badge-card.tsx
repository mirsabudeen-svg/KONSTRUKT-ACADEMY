"use client";

import { createElement, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

import { getModuleBadgeIcon } from "@/lib/progress/stats";
import { cn } from "@/lib/utils";

export type BadgeCardProps = {
  badge_name: string;
  module_title: string;
  module_id: number;
  earned: boolean;
  earned_at?: Date | string | null;
  score?: number | null;
};

export function BadgeCard({
  badge_name,
  module_title,
  module_id,
  earned,
  earned_at,
  score,
}: BadgeCardProps) {
  const BadgeIcon = useMemo(
    () => getModuleBadgeIcon(module_id),
    [module_id]
  );
  const earnedDate =
    earned_at instanceof Date
      ? earned_at
      : earned_at
        ? new Date(earned_at)
        : null;

  return (
    <div className="group h-44 [perspective:1000px]">
      <motion.div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]"
        whileHover={{ scale: 1.02 }}
      >
        {/* Front */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-4 [backface-visibility:hidden]",
            earned
              ? "border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 to-violet-950/30 shadow-[0_0_30px_-8px] shadow-cyan-500/30"
              : "border-zinc-700/50 bg-zinc-900/60 grayscale"
          )}
        >
          <div
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full border-2",
              earned
                ? "border-cyan-400/50 bg-cyan-500/10"
                : "border-zinc-600/50 bg-zinc-800/50"
            )}
          >
            {createElement(BadgeIcon, {
              className: cn(
                "size-7",
                earned ? "text-cyan-300" : "text-zinc-500"
              ),
              "aria-hidden": true,
            })}
            {!earned && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Lock className="size-5 text-zinc-400" aria-hidden />
              </div>
            )}
          </div>
          <p
            className={cn(
              "font-display mt-3 text-center text-sm font-semibold",
              earned ? "text-cyan-100" : "text-zinc-500"
            )}
          >
            {badge_name}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Module {module_id}
          </p>
        </div>

        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]",
            earned
              ? "border-violet-500/30 bg-gradient-to-br from-violet-950/50 to-cyan-950/30"
              : "border-zinc-700/50 bg-zinc-900/80"
          )}
        >
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-violet-300/80">
            {module_title}
          </p>
          {earned ? (
            <>
              {score != null && (
                <p className="font-display mt-3 text-2xl font-bold text-cyan-300">
                  {score}
                  <span className="text-sm text-muted-foreground">/100</span>
                </p>
              )}
              {earnedDate && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Earned{" "}
                  {earnedDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-center text-sm text-zinc-500">
              Complete Module {module_id} to unlock
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
