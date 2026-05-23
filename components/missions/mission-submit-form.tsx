"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MissionSubmitFormProps = {
  moduleId: number;
  disabled?: boolean;
  disabledReason?: string;
};

export function MissionSubmitForm({
  moduleId,
  disabled = false,
  disabledReason,
}: MissionSubmitFormProps) {
  const router = useRouter();
  const [workDescription, setWorkDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || submitting || success) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("workDescription", workDescription);
    if (file) formData.append("file", file);

    try {
      const res = await fetch(`/api/missions/${moduleId}/submit`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Submission failed");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-12 text-center">
        <CheckCircle2 className="size-12 text-emerald-400" aria-hidden />
        <p className="font-display mt-4 text-xl font-bold text-emerald-300">
          Submitted! Waiting for Trainer Review ✅
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your trainer will review your work and unlock the next mission when
          approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {disabled && disabledReason && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {disabledReason}
        </p>
      )}

      <div>
        <label
          htmlFor="work-description"
          className="font-display text-sm font-medium text-cyan-300"
        >
          Your work
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste Arduino/C++ code or describe what you built for this mission.
        </p>
        <Textarea
          id="work-description"
          value={workDescription}
          onChange={(e) => setWorkDescription(e.target.value)}
          disabled={disabled || submitting}
          rows={8}
          placeholder="// Sequential servo motion example&#10;setJointAngle(1, 90);&#10;delay(1000);&#10;setJointAngle(2, 45);"
          className="mt-2 border-cyan-500/20 bg-black/30 font-mono text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="mission-file"
          className="font-display text-sm font-medium text-violet-300"
        >
          File upload (optional)
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          STL, PNG, or JPG — max 25 MB
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 px-4 py-3 text-sm transition-colors hover:bg-violet-500/10",
              (disabled || submitting) && "pointer-events-none opacity-50"
            )}
          >
            <Upload className="size-4 text-violet-400" aria-hidden />
            {file ? file.name : "Choose file"}
            <input
              id="mission-file"
              type="file"
              accept=".stl,.png,.jpg,.jpeg,.webp,image/*,model/stl"
              className="sr-only"
              disabled={disabled || submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => setFile(null)}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={disabled || submitting}
        className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        Submit for Review
      </Button>
    </form>
  );
}
