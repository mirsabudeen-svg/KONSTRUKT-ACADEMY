"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Box,
  CheckCircle2,
  Loader2,
  Printer,
  Users,
} from "lucide-react";

import { PrintQueueTable } from "@/components/trainer/print-queue-table";
import { Button } from "@/components/ui/button";
import type { HardwareStats } from "@/lib/hardware/queries";
import type { PrintQueueRow } from "@/lib/hardware/types";

type HardwareDashboardClientProps = {
  jobs: PrintQueueRow[];
  stats: HardwareStats;
  pendingValidations: Array<{
    id: string;
    file_name: string | null;
    studentName: string;
    module_id: number | null;
  }>;
  studentActivity: Array<{
    studentId: string;
    studentName: string;
    simulations: number;
    models: number;
    tokens: number;
  }>;
};

export function HardwareDashboardClient({
  jobs,
  stats,
  pendingValidations,
  studentActivity,
}: HardwareDashboardClientProps) {
  const router = useRouter();
  const [validatingAll, setValidatingAll] = useState(false);

  const validateAll = async () => {
    setValidatingAll(true);
    try {
      await Promise.all(
        pendingValidations.map((v) =>
          fetch("/api/hardware/print-queue", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: v.id,
              status: "queued",
              validation_passed: true,
            }),
          })
        )
      );
      router.refresh();
    } finally {
      setValidatingAll(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Printer className="size-5 text-cyan-400" />
          Print Queue
        </h2>
        <PrintQueueTable
          initialJobs={jobs}
          queueClearanceHours={stats.queueClearanceHours}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
            <CheckCircle2 className="size-5 text-violet-400" />
            Pending Validations
          </h2>
          {pendingValidations.length > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={validatingAll}
              onClick={() => void validateAll()}
              className="gap-2 bg-violet-600 hover:bg-violet-500"
            >
              {validatingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Validate All
            </Button>
          )}
        </div>
        {pendingValidations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No STL files waiting for validation.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingValidations.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{v.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.file_name ?? "Unnamed file"} · Module {v.module_id}
                  </p>
                </div>
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">
                  validating
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Activity className="size-5 text-emerald-400" />
          Hardware Stats
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Prints completed today"
            value={stats.printsCompletedToday}
          />
          <StatCard
            label="Filament used today (g)"
            value={stats.totalFilamentGrams}
          />
          <StatCard
            label="Failed print rate"
            value={`${stats.failedPrintRate}%`}
          />
          <StatCard
            label="Avg print time"
            value={`${stats.averagePrintMinutes}m`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Users className="size-5 text-amber-400" />
          Student Hardware Activity (Today)
        </h2>
        {studentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hardware activity recorded today.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Simulations</th>
                  <th className="px-4 py-3">3D Models</th>
                  <th className="px-4 py-3">Tokens Used</th>
                </tr>
              </thead>
              <tbody>
                {studentActivity.map((row) => (
                  <tr
                    key={row.studentId}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium">{row.studentName}</td>
                    <td className="px-4 py-3 font-mono">{row.simulations}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Box className="size-3 text-violet-400" />
                        {row.models}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {row.tokens}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Code simulations: {stats.simulationsToday} · 3D generations:{" "}
          {stats.designPromptsToday} · Tokens used: {stats.tokensUsedToday}
        </p>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
