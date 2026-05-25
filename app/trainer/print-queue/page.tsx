import { Printer } from "lucide-react";

import { PrintQueueTable } from "@/components/trainer/print-queue-table";
import {
  fetchPrintJobsQueue,
  fetchHardwareStats,
} from "@/lib/hardware/queries";

export default async function TrainerPrintQueuePage() {
  const [jobs, stats] = await Promise.all([
    fetchPrintJobsQueue(),
    fetchHardwareStats(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-400/80">
          Hardware Intelligence
        </p>
        <h1 className="font-display mt-1 flex items-center gap-3 text-3xl font-bold">
          <Printer className="size-8 text-cyan-400" aria-hidden />
          Print Queue AI
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          AI-estimated print times, drag-to-reorder priority, and live printer
          utilization timeline.
        </p>
      </div>

      <PrintQueueTable
        initialJobs={jobs}
        queueClearanceHours={stats.queueClearanceHours}
      />
    </div>
  );
}
