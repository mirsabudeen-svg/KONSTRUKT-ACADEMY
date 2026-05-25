"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, SkipForward } from "lucide-react";

import type { DailyBriefing } from "@/lib/communications/types";
import { useXPToast } from "@/components/gamification/xp-toast";
import { Button } from "@/components/ui/button";

export function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const { showXPToast } = useXPToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/communications/daily-briefing");
      if (res.ok) {
        const json = await res.json();
        setBriefing(json.briefing ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markComplete() {
    if (!briefing) return;
    setActing(true);
    try {
      const res = await fetch("/api/communications/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          briefing_id: briefing.id,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        showXPToast(json.xp ?? 10, "daily_briefing", "Daily Briefing Complete");
        setBriefing({ ...briefing, completed: true });
      }
    } finally {
      setActing(false);
    }
  }

  async function skip() {
    if (!briefing) return;
    setActing(true);
    try {
      await fetch("/api/communications/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "skip",
          briefing_id: briefing.id,
        }),
      });
      setBriefing({ ...briefing, completed: true });
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-zinc-950/60 p-5 text-sm text-muted-foreground">
        Loading today&apos;s mission brief…
      </div>
    );
  }

  if (!briefing) return null;

  const dateLabel = new Date(briefing.briefing_date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/40 to-zinc-950/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="size-5 text-cyan-400" />
        <div>
          <h2 className="font-display text-lg font-semibold text-cyan-200">
            Today&apos;s Mission Brief
          </h2>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        </div>
        {briefing.completed && (
          <CheckCircle2 className="ml-auto size-5 text-emerald-400" />
        )}
      </div>

      <p className="mb-4 text-sm leading-relaxed text-foreground/90">
        {briefing.content}
      </p>

      {briefing.task && (
        <div className="mb-4 rounded-lg border border-cyan-500/15 bg-black/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan-400">
            🎯 Task
          </p>
          <p className="mt-1 text-sm">{briefing.task}</p>
        </div>
      )}

      <p className="mb-4 text-xs text-muted-foreground">
        ⚡ Complete for +{briefing.xp_reward} XP
      </p>

      {!briefing.completed ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => void markComplete()}
            disabled={acting}
            className="bg-cyan-600 hover:bg-cyan-500"
          >
            Mark Complete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void skip()}
            disabled={acting}
            className="gap-1 text-muted-foreground"
          >
            <SkipForward className="size-3" />
            Skip
          </Button>
        </div>
      ) : (
        <p className="text-sm text-emerald-400">Briefing completed for today ✓</p>
      )}
    </div>
  );
}
