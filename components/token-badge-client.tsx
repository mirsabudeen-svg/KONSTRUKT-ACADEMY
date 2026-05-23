"use client";

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TokenBadgeClient({
  tokens,
  className,
}: {
  tokens: number;
  className?: string;
}) {
  const depleted = tokens <= 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        "w-full justify-center gap-1.5 border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300",
        depleted && "border-amber-500/40 bg-amber-500/10 text-amber-300",
        className
      )}
    >
      <Sparkles className="size-3.5" aria-hidden />
      <span>{tokens} AI Tokens</span>
    </Badge>
  );
}
