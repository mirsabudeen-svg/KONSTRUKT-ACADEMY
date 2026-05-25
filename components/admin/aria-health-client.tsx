"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Play, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HealthData = {
  context?: {
    api_health: Record<string, string>;
    platform_stats: Record<string, number>;
  };
  dbHealth?: {
    table_sizes: Record<string, number>;
    slow_queries: number;
  };
  errorTimeline?: {
    id: string;
    check_type: string;
    status: string;
    error_message: string | null;
    checked_at: string;
    response_time_ms: number | null;
  }[];
  maintenanceTasks?: {
    id: string;
    title: string;
    task_type: string;
    status: string;
    created_at: string;
    result?: { summary?: string };
  }[];
  checkedAt?: string;
};

function statusDot(status: string) {
  if (status === "healthy") return "bg-emerald-400";
  if (status === "degraded") return "bg-amber-400";
  if (status === "down") return "bg-red-500";
  return "bg-zinc-500";
}

const RUNNABLE_TASKS = [
  { type: "token_audit", label: "Token Audit" },
  { type: "user_sync", label: "User Sync" },
  { type: "database_cleanup", label: "DB Cleanup" },
  { type: "orphan_check", label: "Orphan Check" },
];

export function AriaHealthClient() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [lastChecks, setLastChecks] = useState<
    { service: string; status: string; response_time_ms: number }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/aria/health");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function runHealthCheck() {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/admin/aria/health", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setLastChecks(json.checks ?? []);
        void load();
      }
    } finally {
      setRunningCheck(false);
    }
  }

  async function runTask(taskType: string) {
    setRunningTask(taskType);
    try {
      await fetch("/api/admin/aria/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type: taskType }),
      });
      void load();
    } finally {
      setRunningTask(null);
    }
  }

  const apiHealth = data?.context?.api_health ?? {};
  const checks =
    lastChecks.length > 0
      ? lastChecks
      : Object.entries(apiHealth).map(([service, status]) => ({
          service,
          status,
          response_time_ms: 0,
        }));

  type ErrorRow = NonNullable<HealthData["errorTimeline"]>[number];
  const groupedErrors = (data?.errorTimeline ?? []).reduce<
    Record<string, ErrorRow[]>
  >((acc, err) => {
    const key = err.check_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(err);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/aria"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-300"
          >
            <ArrowLeft className="size-3" />
            Back to ARIA
          </Link>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            💊 System Health Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Last loaded:{" "}
            {data?.checkedAt
              ? new Date(data.checkedAt).toLocaleString()
              : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" disabled={runningCheck} onClick={() => void runHealthCheck()}>
            {runningCheck ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Run Health Check"
            )}
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
          API Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {checks.map((check) => (
            <div
              key={check.service}
              className="rounded-xl border border-orange-500/15 bg-sidebar/40 p-4"
            >
              <div className="mb-2 flex items-center gap-2 capitalize">
                <span
                  className={cn("size-2.5 rounded-full", statusDot(check.status))}
                />
                <span className="font-medium text-orange-200">{check.service}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Status: {check.status}
              </p>
              {check.response_time_ms > 0 && (
                <p className="font-mono text-xs text-orange-300">
                  {check.response_time_ms}ms
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-orange-300">
            Database Health
          </h2>
          <Button variant="outline" size="xs" onClick={() => void runTask("orphan_check")}>
            Run Diagnostics
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-orange-500/15">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-orange-500/15 bg-orange-500/5 text-[10px] uppercase tracking-wider text-orange-300">
              <tr>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Row Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data?.dbHealth?.table_sizes ?? {}).map(
                ([table, count]) => (
                  <tr
                    key={table}
                    className="border-b border-orange-500/10 hover:bg-orange-500/5"
                  >
                    <td className="px-4 py-2 font-mono">{table}</td>
                    <td className="px-4 py-2">{count >= 0 ? count : "error"}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {(data?.dbHealth?.slow_queries ?? 0) > 0 && (
          <p className="mt-2 text-sm text-amber-300">
            ⚠ {data?.dbHealth?.slow_queries} slow table queries detected
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
          Error Log Timeline
        </h2>
        <div className="space-y-4">
          {Object.entries(groupedErrors).map(([service, errors]) => (
            <div key={service} className="rounded-xl border border-orange-500/15 p-4">
              <p className="mb-2 font-mono text-sm capitalize text-orange-300">
                {service}
              </p>
              <div className="space-y-2">
                {(errors ?? []).slice(0, 10).map((err) => (
                  <div
                    key={err.id}
                    className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Badge variant="outline">{err.status}</Badge>
                    <span>{err.error_message ?? "No message"}</span>
                    <span className="ml-auto">
                      {new Date(err.checked_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedErrors).length === 0 && (
            <p className="text-sm text-muted-foreground">No recent errors</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
          Maintenance Tasks
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {RUNNABLE_TASKS.map((t) => (
            <Button
              key={t.type}
              variant="outline"
              size="sm"
              disabled={runningTask === t.type}
              onClick={() => void runTask(t.type)}
            >
              {runningTask === t.type ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {t.label}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {(data?.maintenanceTasks ?? []).slice(0, 15).map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-500/10 p-3 text-sm"
            >
              <Badge
                className={cn(
                  task.status === "completed" && "bg-emerald-500/20 text-emerald-300",
                  task.status === "failed" && "bg-red-500/20 text-red-300",
                  task.status === "pending" && "bg-amber-500/20 text-amber-300"
                )}
              >
                {task.status}
              </Badge>
              <span className="font-medium">{task.title}</span>
              <span className="text-xs text-muted-foreground">{task.task_type}</span>
              {task.result?.summary && (
                <span className="w-full text-xs text-muted-foreground">
                  {task.result.summary}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
