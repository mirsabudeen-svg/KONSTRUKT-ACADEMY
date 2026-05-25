"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudentDetailModal } from "@/components/trainer/student-detail-modal";
import type {
  CohortHeatmapCell,
  CohortHeatmapData,
} from "@/lib/trainer/cohort-heatmap";
import type { ProgressStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type CohortHeatmapProps = {
  data: CohortHeatmapData;
};

function cellStyle(
  status: ProgressStatus | "locked",
  score: number | null
): string {
  if (status === "completed") {
    if (score != null && score >= 90) {
      return "bg-emerald-400/60 ring-1 ring-emerald-300/50";
    }
    return "bg-emerald-500/30";
  }
  switch (status) {
    case "ready":
      return "bg-cyan-400/20";
    case "in_progress":
      return "bg-violet-600/30";
    case "pending_review":
      return "bg-amber-500/30";
    default:
      return "bg-[#1a1a2e]";
  }
}

function cellIcon(status: ProgressStatus | "locked"): string {
  switch (status) {
    case "ready":
      return "○";
    case "in_progress":
      return "▶";
    case "pending_review":
      return "⏳";
    case "completed":
      return "";
    default:
      return "·";
  }
}

function HeatmapCell({
  cell,
  studentName,
  onClick,
}: {
  cell: CohortHeatmapCell;
  studentName: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const highScore =
    cell.status === "completed" && cell.score != null && cell.score >= 90;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "flex size-9 items-center justify-center rounded text-[10px] font-mono transition-transform hover:scale-110",
          cellStyle(cell.status, cell.score)
        )}
        aria-label={`${studentName} — ${cell.moduleTitle}`}
      >
        {cell.status === "completed" && cell.score != null ? (
          <span className="flex items-center gap-0.5">
            {highScore && <Star className="size-2 fill-emerald-200 text-emerald-200" />}
            {cell.score}
          </span>
        ) : (
          <span className="text-muted-foreground">{cellIcon(cell.status)}</span>
        )}
      </button>

      {hover && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-lg border border-violet-500/30 bg-zinc-900 px-3 py-2 text-left text-xs shadow-xl">
          <p className="font-medium">{studentName}</p>
          <p className="text-muted-foreground">{cell.moduleTitle}</p>
          <p className="mt-1 capitalize">{cell.status.replace(/_/g, " ")}</p>
          {cell.score != null && <p>Score: {cell.score}/100</p>}
          {cell.updatedAt && (
            <p className="text-muted-foreground">
              Updated: {new Date(cell.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CohortHeatmap({ data }: CohortHeatmapProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(
    null
  );

  const legend = useMemo(
    () => [
      { label: "Locked", className: "bg-[#1a1a2e]" },
      { label: "Ready", className: "bg-cyan-400/20" },
      { label: "In progress", className: "bg-violet-600/30" },
      { label: "Pending review", className: "bg-amber-500/30" },
      { label: "Completed", className: "bg-emerald-500/30" },
      { label: "90+ score", className: "bg-emerald-400/60 ring-1 ring-emerald-300/50" },
    ],
    []
  );

  if (data.students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No students in cohort to display.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-violet-500/30"
            onClick={() => setExpanded((e) => !e)}
          >
            Cohort Overview
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
          <div className="hidden flex-wrap gap-3 sm:flex">
            {legend.map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <span className={cn("size-3 rounded", item.className)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {expanded && (
          <div className="overflow-x-auto rounded-xl border border-violet-500/15 bg-black/20 p-4">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-zinc-950 px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                    Student
                  </th>
                  {data.modules.map((mod) => (
                    <th
                      key={mod.id}
                      className="px-1 py-1 text-center text-[10px] font-medium text-muted-foreground"
                      title={mod.title}
                    >
                      M{mod.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.studentId}>
                    <td className="sticky left-0 z-10 max-w-[120px] truncate bg-zinc-950 px-2 py-1 text-xs font-medium">
                      {student.studentName}
                    </td>
                    {student.cells.map((cell) => (
                      <td key={cell.moduleId} className="p-0">
                        <HeatmapCell
                          cell={cell}
                          studentName={student.studentName}
                          onClick={() => {
                            setSelectedStudentId(student.studentId);
                            setSelectedModuleId(cell.moduleId);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentDetailModal
        studentId={selectedStudentId}
        moduleId={selectedModuleId}
        onClose={() => {
          setSelectedStudentId(null);
          setSelectedModuleId(null);
        }}
      />
    </>
  );
}
