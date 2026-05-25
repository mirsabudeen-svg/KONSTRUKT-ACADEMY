import { AlertTriangle, BarChart3, Printer, Users } from "lucide-react";

import { CohortHeatmapLazy } from "@/components/trainer/cohort-heatmap-lazy";
import { PrintQueueKanban } from "@/components/trainer/print-queue-kanban";
import {
  StudentAlertsHeaderBadge,
  StudentAlertsPanel,
} from "@/components/trainer/student-alerts-panel";
import { StudentManagementList } from "@/components/trainer/student-management-list";
import { SafetyAlertsPanel } from "@/components/trainer/safety-alerts-panel";
import { TrainerAlertRunner } from "@/components/trainer/trainer-alert-runner";
import { fetchLearningAlerts } from "@/lib/ai/alert-engine";
import { fetchTrainerSafetyFlags } from "@/lib/safety/queries";
import { fetchCohortHeatmapData } from "@/lib/trainer/cohort-heatmap";
import {
  fetchPrintQueueKanban,
  fetchTrainerStudents,
} from "@/lib/supabase/trainer-actions";

export default async function TrainerDashboardPage() {
  const [printQueue, students, alerts, heatmap, safetyFlags] = await Promise.all([
    fetchPrintQueueKanban(),
    fetchTrainerStudents(),
    fetchLearningAlerts(false),
    fetchCohortHeatmapData(),
    fetchTrainerSafetyFlags(),
  ]);

  const highCriticalCount = safetyFlags.filter(
    (f) => f.severity === "high" || f.severity === "critical"
  ).length;

  return (
    <div className="space-y-10">
      <TrainerAlertRunner />

      <div>
        <p className="text-sm uppercase tracking-widest text-violet-400/80">
          Trainer Operations
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          Mission Control Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage Bambu Lab print jobs, monitor at-risk cadets, and refill AI
          tokens. Use the cohort heatmap to spot stuck students at a glance.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-cyan-400" aria-hidden />
          <h2 className="font-display text-xl font-semibold">Cohort Overview</h2>
        </div>
        <CohortHeatmapLazy data={heatmap} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-red-400" aria-hidden />
          <h2 className="font-display text-xl font-semibold">Student Alerts</h2>
          <StudentAlertsHeaderBadge count={alerts.length} />
        </div>
        <StudentAlertsPanel initialAlerts={alerts} />
      </section>

      <SafetyAlertsPanel
        initialFlags={safetyFlags}
        highCriticalCount={highCriticalCount}
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Printer className="size-5 text-cyan-400" aria-hidden />
          <h2 className="font-display text-xl font-semibold">Print Queue</h2>
        </div>
        <PrintQueueKanban initialItems={printQueue} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-violet-400" aria-hidden />
          <h2 className="font-display text-xl font-semibold">
            Student Management
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            ({students.length} cadets)
          </span>
        </div>
        <StudentManagementList initialStudents={students} />
      </section>
    </div>
  );
}
