import { Cpu } from "lucide-react";

import { HardwareDashboardClient } from "@/components/trainer/hardware-dashboard-client";
import {
  fetchHardwareStats,
  fetchPendingValidations,
  fetchPrintJobsQueue,
  fetchStudentHardwareActivity,
} from "@/lib/hardware/queries";

export default async function TrainerHardwarePage() {
  const [jobs, stats, pending, activity] = await Promise.all([
    fetchPrintJobsQueue(),
    fetchHardwareStats(),
    fetchPendingValidations(),
    fetchStudentHardwareActivity(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-400/80">
          Sprint 6 · Hardware Intelligence
        </p>
        <h1 className="font-display mt-1 flex items-center gap-3 text-3xl font-bold">
          <Cpu className="size-8 text-cyan-400" aria-hidden />
          Hardware Operations
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Combined view of print queue, design validations, hardware stats, and
          student activity.
        </p>
      </div>

      <HardwareDashboardClient
        jobs={jobs}
        stats={stats}
        pendingValidations={pending}
        studentActivity={activity}
      />
    </div>
  );
}
