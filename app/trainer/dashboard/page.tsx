import { Printer, Users } from "lucide-react";

import { PrintQueueKanban } from "@/components/trainer/print-queue-kanban";
import { StudentManagementList } from "@/components/trainer/student-management-list";
import {
  fetchPrintQueueKanban,
  fetchTrainerStudents,
} from "@/lib/supabase/trainer-actions";

export default async function TrainerDashboardPage() {
  const [printQueue, students] = await Promise.all([
    fetchPrintQueueKanban(),
    fetchTrainerStudents(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-400/80">
          Trainer Operations
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          Mission Control Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage Bambu Lab print jobs and refill cadet AI tokens. Drag cards
          between columns or use quick status buttons.
        </p>
      </div>

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
