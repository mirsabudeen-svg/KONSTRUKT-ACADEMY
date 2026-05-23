import type { PrintQueueStatus } from "@/lib/db/types";

export type PrintQueueKanbanItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  submissionId: string | null;
  status: PrintQueueStatus;
  printerAssigned: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainerStudentRow = {
  id: string;
  displayName: string;
  email: string | null;
  tokensRemaining: number;
  cohortId: string | null;
  createdAt: string;
};

export const TOKEN_REFILL_AMOUNT = 5;

export const PRINT_QUEUE_COLUMNS: {
  status: PrintQueueStatus;
  label: string;
  accent: string;
}[] = [
  {
    status: "waiting_for_printer",
    label: "Waiting",
    accent: "border-amber-500/30 bg-amber-500/5",
  },
  {
    status: "printing",
    label: "Printing",
    accent: "border-cyan-500/30 bg-cyan-500/5",
  },
  {
    status: "failed",
    label: "Failed",
    accent: "border-red-500/30 bg-red-500/5",
  },
  {
    status: "completed",
    label: "Completed",
    accent: "border-emerald-500/30 bg-emerald-500/5",
  },
];

export function isValidPrintQueueStatus(
  value: string
): value is PrintQueueStatus {
  return [
    "waiting_for_printer",
    "printing",
    "failed",
    "completed",
  ].includes(value);
}

export type { PrintQueueStatus } from "@/lib/db/types";
