"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type StreakBadgeProps = {
  streak: number;
  className?: string;
  size?: "sm" | "md";
};

export function StreakBadge({
  streak,
  size = "md",
}: StreakBadgeProps) {
  const active = streak > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-gradient-to-r from-orange-500/20 to-red-500/20 font-mono font-semibold text-orange-300",
            size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
            !active && "opacity-50 grayscale"
          )}
        >
          <motion.span
            className="inline-flex items-center gap-1"
            animate={active ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: active ? Infinity : 0, duration: 2 }}
          >
            <Flame
              className={cn(
                "text-orange-400",
                size === "sm" ? "size-3" : "size-4"
              )}
              aria-hidden
            />
            <span>{streak}</span>
          </motion.span>
        </TooltipTrigger>
        <TooltipContent>
          {active ? `${streak} day streak!` : "Start your streak today"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
