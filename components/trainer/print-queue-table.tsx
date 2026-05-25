"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  GripVertical,
  Play,
  Printer,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PrintJobStatus, PrintQueueRow } from "@/lib/hardware/types";
import { cn } from "@/lib/utils";

type PrintQueueTableProps = {
  initialJobs: PrintQueueRow[];
  queueClearanceHours: number;
  printerOnline?: boolean;
};

const STATUS_COLORS: Record<PrintJobStatus, string> = {
  queued: "text-amber-300 bg-amber-500/10",
  validating: "text-violet-300 bg-violet-500/10",
  printing: "text-cyan-300 bg-cyan-500/10",
  completed: "text-emerald-300 bg-emerald-500/10",
  failed: "text-red-300 bg-red-500/10",
  cancelled: "text-zinc-400 bg-zinc-500/10",
};

const STUDENT_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb7185",
];

export function PrintQueueTable({
  initialJobs,
  queueClearanceHours,
  printerOnline: initialOnline = true,
}: PrintQueueTableProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [printerOnline, setPrinterOnline] = useState(initialOnline);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      printing: jobs.filter((j) => j.status === "printing").length,
      waiting: jobs.filter(
        (j) => j.status === "queued" || j.status === "validating"
      ).length,
      doneToday: jobs.filter(
        (j) =>
          j.status === "completed" &&
          j.completed_at &&
          new Date(j.completed_at) >= today
      ).length,
    };
  }, [jobs]);

  const updateStatus = useCallback(
    async (id: string, status: PrintJobStatus) => {
      setUpdatingId(id);
      const prev = jobs;
      setJobs((cur) =>
        cur.map((j) => (j.id === id ? { ...j, status } : j))
      );

      try {
        const res = await fetch("/api/hardware/print-queue", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        if (!res.ok) throw new Error("Update failed");
        router.refresh();
      } catch {
        setJobs(prev);
      } finally {
        setUpdatingId(null);
      }
    },
    [jobs, router]
  );

  const reorder = (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    setJobs((cur) => {
      const copy = [...cur];
      const fromIdx = copy.findIndex((j) => j.id === dragId);
      const toIdx = copy.findIndex((j) => j.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return cur;
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const timelineJobs = jobs.filter(
    (j) => j.status === "printing" || j.status === "queued"
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Printing" value={stats.printing} icon={Printer} />
        <StatCard label="Waiting" value={stats.waiting} icon={Clock} />
        <StatCard label="Done today" value={stats.doneToday} icon={CheckCircle2} />
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Queue clearance
          </p>
          <p className="font-display mt-1 text-2xl font-bold text-cyan-300">
            ~{queueClearanceHours}h
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Printer className="size-4 text-cyan-400" />
          <span className="text-sm">Bambu A1 Mini</span>
        </div>
        <button
          type="button"
          onClick={() => setPrinterOnline((v) => !v)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            printerOnline
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-red-500/15 text-red-300"
          )}
        >
          {printerOnline ? "● Online" : "● Offline"}
        </button>
      </div>

      {/* Timeline */}
      {timelineJobs.length > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s timeline
          </p>
          <div className="mt-3 flex h-8 gap-1 overflow-x-auto">
            {timelineJobs.map((job, i) => (
              <div
                key={job.id}
                title={`${job.studentName} — ${job.estimated_print_minutes ?? 45}min`}
                className="h-full min-w-[60px] flex-1 rounded"
                style={{
                  backgroundColor: STUDENT_COLORS[i % STUDENT_COLORS.length],
                  opacity: job.status === "printing" ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3">Module</th>
              <th className="px-3 py-3">File</th>
              <th className="px-3 py-3">Est.</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  No print jobs yet
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  draggable
                  onDragStart={() => setDraggingId(job.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingId) reorder(draggingId, job.id);
                    setDraggingId(null);
                  }}
                  className={cn(
                    "border-b border-white/5 transition-colors hover:bg-white/5",
                    draggingId === job.id && "opacity-50"
                  )}
                >
                  <td className="px-3 py-3">
                    <GripVertical className="size-4 text-muted-foreground" />
                    {job.queuePosition || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{job.studentName}</p>
                    {job.studentEmail && (
                      <p className="text-[10px] text-muted-foreground">
                        {job.studentEmail}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {job.moduleTitle ?? "—"}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-3 font-mono text-xs">
                    {job.file_name ?? "—"}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {job.estimated_print_minutes ?? "—"}m
                    {job.material && (
                      <span className="block text-[10px] text-muted-foreground">
                        {job.material}, {job.weight_grams ?? "?"}g
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                        STATUS_COLORS[job.status]
                      )}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {job.status !== "printing" && (
                        <ActionBtn
                          label="Start"
                          disabled={updatingId === job.id}
                          onClick={() => updateStatus(job.id, "printing")}
                        />
                      )}
                      {job.status === "printing" && (
                        <ActionBtn
                          label="Done"
                          disabled={updatingId === job.id}
                          onClick={() => updateStatus(job.id, "completed")}
                        />
                      )}
                      {!["failed", "cancelled", "completed"].includes(
                        job.status
                      ) && (
                        <>
                          <ActionBtn
                            label="Fail"
                            disabled={updatingId === job.id}
                            onClick={() => updateStatus(job.id, "failed")}
                          />
                          <ActionBtn
                            label="Cancel"
                            disabled={updatingId === job.id}
                            onClick={() => updateStatus(job.id, "cancelled")}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={disabled}
      onClick={onClick}
      className="h-6 px-2 text-[10px]"
    >
      {label}
    </Button>
  );
}
