"use client";

import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";

import type { DesignValidationResult } from "@/lib/hardware/types";
import { cn } from "@/lib/utils";

type DesignValidatorWidgetProps = {
  validation: DesignValidationResult | null;
  loading?: boolean;
};

export function DesignValidatorWidget({
  validation,
  loading = false,
}: DesignValidatorWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-card/40 p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="size-5 animate-spin text-violet-400" />
          <p className="text-sm text-muted-foreground">
            Validating design…
          </p>
        </div>
      </div>
    );
  }

  if (!validation) return null;

  const score = validation.score;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-card/40 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Search className="size-5 text-violet-400" aria-hidden />
        <h3 className="font-display text-lg font-semibold text-violet-200">
          Design Validation
        </h3>
      </div>

      <ul className="mt-4 space-y-2">
        {validation.checks.map((check) => (
          <li
            key={check.name}
            className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
          >
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
            )}
            <div>
              <span className="font-medium">{check.name}:</span>{" "}
              {check.message}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Printability Score</span>
          <span className="font-mono font-semibold text-cyan-300">
            {score}/100
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              score >= 80
                ? "bg-emerald-500"
                : score >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {validation.suggestions.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {validation.suggestions.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      )}

      <p
        className={cn(
          "mt-4 rounded-lg px-4 py-2 text-center text-sm font-medium",
          validation.ready_to_print
            ? "bg-emerald-500/10 text-emerald-300"
            : "bg-amber-500/10 text-amber-300"
        )}
      >
        {validation.ready_to_print
          ? "Ready to submit! ✓"
          : "Review suggestions before submitting"}
      </p>
    </div>
  );
}
