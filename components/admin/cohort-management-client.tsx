"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { AdminCohortRow } from "@/lib/admin/cohorts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CohortsData = {
  cohorts: AdminCohortRow[];
  trainers: { id: string; name: string }[];
};

export function CohortManagementClient() {
  const [data, setData] = useState<CohortsData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    trainerId: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/cohorts");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function createCohort(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        startDate: form.startDate || null,
        trainerId: form.trainerId || null,
      }),
    });
    setShowModal(false);
    setForm({ name: "", startDate: "", trainerId: "" });
    await load();
  }

  async function updateTrainer(cohortId: string, trainerId: string) {
    await fetch("/api/admin/cohorts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId, trainerId: trainerId || null }),
    });
    await load();
  }

  async function archiveCohort(cohortId: string) {
    if (!confirm("Archive this cohort? Students will be unassigned.")) return;
    await fetch(`/api/admin/cohorts?cohort_id=${cohortId}`, {
      method: "DELETE",
    });
    await load();
  }

  function statusBadge(status: AdminCohortRow["status"]) {
    const colors = {
      Active: "bg-emerald-500/20 text-emerald-300",
      Completed: "bg-cyan-500/20 text-cyan-300",
      Upcoming: "bg-violet-500/20 text-violet-300",
    };
    return (
      <Badge className={colors[status]}>{status}</Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            Cohort Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage batches and trainer assignments
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="gap-2 bg-orange-600 hover:bg-orange-500"
        >
          <Plus className="size-4" />
          Create Cohort
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.cohorts ?? []).map((cohort) => (
          <div
            key={cohort.id}
            className="rounded-xl border border-orange-500/15 bg-card/50 p-5"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-display font-semibold text-orange-200">
                  {cohort.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Start: {cohort.startDate ?? "TBD"}
                </p>
              </div>
              {statusBadge(cohort.status)}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Assigned trainer
                </label>
                <select
                  value={cohort.trainerId ?? ""}
                  onChange={(e) =>
                    void updateTrainer(cohort.id, e.target.value)
                  }
                  className="mt-1 w-full rounded border border-orange-500/20 bg-background/50 px-2 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {(data?.trainers ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{cohort.studentCount} students</span>
                <span>{cohort.averageProgress}% avg progress</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-red-400"
              onClick={() => void archiveCohort(cohort.id)}
            >
              <Trash2 className="mr-1 size-3" />
              Archive
            </Button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(e) => void createCohort(e)}
            className="w-full max-w-md rounded-xl border border-orange-500/20 bg-card p-6 shadow-xl"
          >
            <h2 className="mb-4 font-display text-lg font-semibold text-orange-200">
              Create Cohort
            </h2>
            <div className="space-y-3">
              <input
                required
                placeholder="Cohort name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="w-full rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
              />
              <select
                value={form.trainerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trainerId: e.target.value }))
                }
                className="w-full rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
              >
                <option value="">Assign trainer…</option>
                {(data?.trainers ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-500">
                Create
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
