"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ButtonLoader } from "@/components/loading/button-loader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { challengeSchema } from "@/lib/validation/schemas";

type ModuleOption = { id: number; title: string };

type CreateChallengeFormProps = {
  modules: ModuleOption[];
  cohortId: string | null;
  cohortName?: string;
};

export function CreateChallengeForm({
  modules,
  cohortId,
  cohortName,
}: CreateChallengeFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cohortId) {
      setError("No cohort assigned to your trainer account");
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const description = form.get("description") as string;
    const moduleId = form.get("module_id") as string;
    const xpReward = parseInt(form.get("xp_reward") as string, 10);
    const deadline = form.get("deadline") as string;

    const parsed = challengeSchema.safeParse({
      title,
      deadline: deadline ? `${deadline}T23:59:59` : new Date(Date.now() + 86400000).toISOString(),
      xpReward: xpReward || 50,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          module_id: moduleId ? parseInt(moduleId, 10) : undefined,
          xp_reward: xpReward || 50,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          cohort_id: cohortId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create challenge");
        toast.error("Failed to create challenge ❌");
        return;
      }

      toast.success("Challenge created ✅");
      router.refresh();
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-violet-500/20 bg-zinc-950/50 p-6"
    >
      <h2 className="font-display text-lg font-semibold text-violet-300">
        Create Challenge
      </h2>

      {cohortName && (
        <p className="text-sm text-muted-foreground">
          Cohort: <span className="text-foreground">{cohortName}</span>
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Speed Run Challenge"
          aria-invalid={!!fieldErrors.title}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />
        {fieldErrors.title && (
          <p className="text-xs text-red-400">{fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Complete Module 5 in 3 days"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="module_id" className="text-sm font-medium">
            Module
          </label>
          <select
            id="module_id"
            name="module_id"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          >
            <option value="">Any module</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                M{m.id}: {m.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="xp_reward" className="text-sm font-medium">
            XP Reward
          </label>
          <input
            id="xp_reward"
            name="xp_reward"
            type="number"
            min={10}
            max={500}
            defaultValue={50}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="deadline" className="text-sm font-medium">
          Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          required
          aria-invalid={!!fieldErrors.deadline}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />
        {fieldErrors.deadline && (
          <p className="text-xs text-red-400">{fieldErrors.deadline}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ButtonLoader type="submit" loading={loading} disabled={!cohortId}>
        Create Challenge
      </ButtonLoader>
    </form>
  );
}
