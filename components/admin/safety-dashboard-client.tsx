"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  Filter,
  Loader2,
  Shield,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { NoSafetyFlags } from "@/components/empty/empty-state";
import type { SafetyFlagRow, SafetyOverview } from "@/lib/safety/queries";
import { cn } from "@/lib/utils";

type SafetyDashboardClientProps = {
  overview: SafetyOverview;
  flags: SafetyFlagRow[];
  plagiarism: Array<{
    id: string;
    submission_id: string;
    studentName: string;
    module_id: number | null;
    similarity_score: number;
    ai_generated_probability: number;
    checked_at: string;
  }>;
  filters: Array<{
    id: string;
    filter_type: string;
    value: string;
    active: boolean;
  }>;
  sessionStats: {
    avgSessionMinutes: number;
    breakSuggestions: number;
    longestSession: number;
    totalSessionsToday: number;
  };
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-zinc-400 bg-zinc-500/10",
  medium: "text-amber-300 bg-amber-500/10",
  high: "text-orange-300 bg-orange-500/10",
  critical: "text-red-300 bg-red-500/10",
};

export function SafetyDashboardClient({
  overview,
  flags: initialFlags,
  plagiarism,
  filters: initialFilters,
  sessionStats,
}: SafetyDashboardClientProps) {
  const router = useRouter();
  const [flags, setFlags] = useState(initialFlags);
  const [filters, setFilters] = useState(initialFilters);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [newFilter, setNewFilter] = useState("");
  const [testValue, setTestValue] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredFlags =
    severityFilter === "all"
      ? flags
      : severityFilter === "unreviewed"
        ? flags.filter((f) => !f.reviewed && !f.resolved)
        : flags.filter((f) => f.severity === severityFilter);

  const resolveFlag = async (id: string) => {
    await fetch("/api/safety/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flag_id: id, resolved: true }),
    });
    setFlags((cur) =>
      cur.map((f) =>
        f.id === id ? { ...f, reviewed: true, resolved: true } : f
      )
    );
    router.refresh();
  };

  const addFilter = async () => {
    if (!newFilter.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/safety/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter_type: "blocked_word",
          value: newFilter.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFilters((cur) => [data.filter, ...cur]);
        setNewFilter("");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = async (id: string, active: boolean) => {
    await fetch("/api/safety/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setFilters((cur) =>
      cur.map((f) => (f.id === id ? { ...f, active: !active } : f))
    );
  };

  const testFilter = useCallback(async () => {
    if (!testValue.trim()) return;
    const res = await fetch("/api/safety/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_value: testValue.trim() }),
    });
    const data = await res.json();
    setTestResult(data.blocked ?? false);
  }, [testValue]);

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard label="Total Flags" value={overview.totalFlags} />
        <OverviewCard label="Unreviewed" value={overview.unreviewedFlags} accent="amber" />
        <OverviewCard label="Critical" value={overview.criticalFlags} accent="red" />
        <OverviewCard label="Resolved Today" value={overview.resolvedToday} accent="emerald" />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="size-5 text-red-400" />
            Active Flags
          </h2>
          <div className="flex flex-wrap gap-2">
            {["all", "unreviewed", "critical", "high", "medium", "low"].map(
              (f) => (
                <Button
                  key={f}
                  type="button"
                  size="xs"
                  variant={severityFilter === f ? "default" : "outline"}
                  onClick={() => setSeverityFilter(f)}
                >
                  {f}
                </Button>
              )
            )}
            <a href="/api/safety/admin?export=csv">
              <Button type="button" size="xs" variant="outline" className="gap-1">
                <Download className="size-3" />
                Export CSV
              </Button>
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4">
                    {severityFilter === "all" && flags.length === 0 ? (
                      <NoSafetyFlags />
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">
                        No flags match this filter
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => (
                  <tr key={flag.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">{flag.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{flag.flag_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                          SEVERITY_COLORS[flag.severity]
                        )}
                      >
                        {flag.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{flag.source}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {new Date(flag.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {!flag.resolved && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => void resolveFlag(flag.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Plagiarism Report</h2>
        {plagiarism.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flagged submissions.</p>
        ) : (
          <div className="space-y-2">
            {plagiarism.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    Module {p.module_id} · Similarity:{" "}
                    {Math.round(p.similarity_score * 100)}% · AI prob:{" "}
                    {Math.round(p.ai_generated_probability * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Filter className="size-5 text-violet-400" />
          Content Filters
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            placeholder="Add blocked word or topic"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => void addFilter()}
          >
            Add Filter
          </Button>
        </div>
        <ul className="space-y-2">
          {filters.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2 text-sm"
            >
              <span>
                <span className="text-muted-foreground">{f.filter_type}:</span>{" "}
                {f.value}
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => void toggleFilter(f.id, f.active)}
              >
                {f.active ? "Active" : "Disabled"}
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
            placeholder="Test message against filters"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void testFilter()}>
            Test
          </Button>
          {testResult != null && (
            <span className={testResult ? "text-red-400" : "text-emerald-400"}>
              {testResult ? "Blocked" : "Allowed"}
            </span>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Session Analytics (Today)</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <OverviewCard label="Avg session" value={`${sessionStats.avgSessionMinutes}m`} />
          <OverviewCard label="Break reminders" value={sessionStats.breakSuggestions} />
          <OverviewCard label="Longest session" value={`${sessionStats.longestSession}m`} />
          <OverviewCard label="Total sessions" value={sessionStats.totalSessionsToday} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Shield className="size-5 text-cyan-400" />
          Safety Audit Log
        </h2>
        <ul className="max-h-64 space-y-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-4 text-xs">
          {flags.slice(0, 30).map((f) => (
            <li key={f.id} className="font-mono text-muted-foreground">
              {new Date(f.created_at).toISOString()} · {f.severity} ·{" "}
              {f.flag_type} · {f.studentName} · {f.source}
              {f.resolved && " · resolved"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "amber" | "red" | "emerald";
}) {
  const border =
    accent === "red"
      ? "border-red-500/20"
      : accent === "amber"
        ? "border-amber-500/20"
        : accent === "emerald"
          ? "border-emerald-500/20"
          : "border-white/10";

  return (
    <div className={cn("rounded-xl border bg-black/20 p-4", border)}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 flex items-center gap-2 text-2xl font-bold">
        <ShieldCheck className="size-5 text-orange-400 opacity-60" />
        {value}
      </p>
    </div>
  );
}
