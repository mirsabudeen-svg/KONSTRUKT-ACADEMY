"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import type { CurriculumInsightsData } from "@/lib/admin/curriculum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CurriculumIntelligenceClient() {
  const [data, setData] = useState<CurriculumInsightsData | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/curriculum-insights");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function generateReport() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/curriculum-insights", {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setReport(json.report);
        if (json.computedAt) {
          setData((prev) =>
            prev ? { ...prev, computedAt: json.computedAt } : prev
          );
        }
      }
    } finally {
      setGenerating(false);
    }
  }

  function flagBadge(flags: string[]) {
    if (flags.includes("Good")) {
      return <Badge className="bg-emerald-500/20 text-emerald-300">✅ Good</Badge>;
    }
    if (flags.includes("Too Hard") || flags.includes("Review Needed")) {
      return <Badge className="bg-amber-500/20 text-amber-300">⚠️ Hard</Badge>;
    }
    if (flags.includes("Too Long")) {
      return <Badge className="bg-orange-500/20 text-orange-300">⏱ Too Long</Badge>;
    }
    if (flags.includes("Too Easy")) {
      return <Badge className="bg-cyan-500/20 text-cyan-300">📈 Too Easy</Badge>;
    }
    return <Badge variant="outline">{flags.join(", ")}</Badge>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            Curriculum Intelligence 🧠
          </h1>
          <p className="text-sm text-muted-foreground">
            Last computed:{" "}
            {data?.computedAt
              ? new Date(data.computedAt).toLocaleString()
              : "—"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void load()}
          className="gap-2 text-orange-300"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-orange-500/15">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-orange-500/15 bg-orange-500/5 text-[10px] uppercase tracking-wider text-orange-300">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Module Title</th>
              <th className="px-4 py-3">Avg Score</th>
              <th className="px-4 py-3">Avg Days</th>
              <th className="px-4 py-3">Reject Rate</th>
              <th className="px-4 py-3">Flag</th>
            </tr>
          </thead>
          <tbody>
            {(data?.modules ?? []).map((mod) => (
              <tr
                key={mod.moduleId}
                className="border-b border-orange-500/10 hover:bg-orange-500/5"
              >
                <td className="px-4 py-3 font-mono">{mod.moduleId}</td>
                <td className="px-4 py-3">{mod.title}</td>
                <td className="px-4 py-3">{mod.avgScore}</td>
                <td className="px-4 py-3">{mod.avgCompletionDays} days</td>
                <td className="px-4 py-3">{mod.rejectionRate}%</td>
                <td className="px-4 py-3">{flagBadge(mod.flags)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-orange-200">
            AI Insights
          </h2>
          <Button
            onClick={() => void generateReport()}
            disabled={generating}
            className="gap-2 bg-orange-600 hover:bg-orange-500"
          >
            <Sparkles className="size-4" />
            {generating ? "Generating…" : "Generate Curriculum Report"}
          </Button>
        </div>
        {report ? (
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {report}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click generate to analyze module stats with GPT-4o-mini and receive
            actionable curriculum recommendations.
          </p>
        )}
      </div>
    </div>
  );
}
