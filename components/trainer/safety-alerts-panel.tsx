"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, MessageSquare, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SafetyFlagRow } from "@/lib/safety/queries";
import { cn } from "@/lib/utils";

type SafetyAlertsPanelProps = {
  initialFlags: SafetyFlagRow[];
  highCriticalCount: number;
};

export function SafetyAlertsPanel({
  initialFlags,
  highCriticalCount,
}: SafetyAlertsPanelProps) {
  const router = useRouter();
  const [flags, setFlags] = useState(initialFlags);

  const markReviewed = async (id: string) => {
    await fetch("/api/safety/trainer-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewed: true, resolved: true }),
    });
    setFlags((cur) => cur.filter((f) => f.id !== id));
    router.refresh();
  };

  if (flags.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-red-400" aria-hidden />
        <h2 className="font-display text-xl font-semibold">Safety Alerts</h2>
        {highCriticalCount > 0 && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-mono text-xs text-red-300">
            {highCriticalCount} urgent
          </span>
        )}
      </div>

      <div className="space-y-3">
        {flags.slice(0, 5).map((flag) => (
          <article
            key={flag.id}
            className={cn(
              "rounded-xl border p-4",
              flag.severity === "critical"
                ? "border-red-500/40 bg-red-500/10"
                : flag.severity === "high"
                  ? "border-orange-500/30 bg-orange-500/10"
                  : "border-amber-500/20 bg-amber-500/5"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{flag.studentName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <AlertTriangle className="mr-1 inline size-3.5" />
                  {flag.flag_type.replace(/_/g, " ")} · {flag.source}
                </p>
                {flag.content_snippet && (
                  <p className="mt-2 line-clamp-2 font-mono text-xs text-muted-foreground">
                    {flag.content_snippet}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase text-red-300">
                {flag.severity}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="gap-1"
                onClick={() => void markReviewed(flag.id)}
              >
                <CheckCircle2 className="size-3" />
                Mark Reviewed
              </Button>
              <a
                href="/admin/safety"
                className="inline-flex h-6 items-center gap-1 rounded-lg border border-transparent px-2 text-[10px] hover:bg-muted"
              >
                <MessageSquare className="size-3" />
                Contact Admin
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
