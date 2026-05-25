"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Send, Upload } from "lucide-react";

import { DesignValidatorWidget } from "@/components/hardware/design-validator-widget";
import { ButtonLoader } from "@/components/loading/button-loader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import type { CodeReviewResult } from "@/lib/ai/types";
import type { DesignValidationResult } from "@/lib/hardware/types";
import { missionSubmitSchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

type MissionSubmitFormProps = {
  moduleId: number;
  disabled?: boolean;
  disabledReason?: string;
  showDesignValidation?: boolean;
  externalCode?: string;
};

export function MissionSubmitForm({
  moduleId,
  disabled = false,
  disabledReason,
  showDesignValidation = false,
  externalCode,
}: MissionSubmitFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [workDescription, setWorkDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingReview, setPendingReview] = useState<CodeReviewResult | null>(
    null
  );
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [validation, setValidation] = useState<DesignValidationResult | null>(
    null
  );
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<string | null>(null);

  const effectiveCode = externalCode ?? workDescription;

  const validateStlFile = useCallback(
    async (selectedFile: File) => {
      if (!showDesignValidation) return;

      setValidating(true);
      setValidation(null);

      try {
        const objectUrl = URL.createObjectURL(selectedFile);
        fileInputRef.current = objectUrl;

        const res = await fetch("/api/hardware/validate-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_url: objectUrl,
            module_id: moduleId,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setValidation(data.validation as DesignValidationResult);
        }
      } catch {
        /* validation is best-effort */
      } finally {
        setValidating(false);
      }
    },
    [moduleId, showDesignValidation]
  );

  const performSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("workDescription", effectiveCode);
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

      if (file && showDesignValidation) {
        const uploadUrl = data.content_url ?? file.name;
        void fetch("/api/hardware/print-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_url: uploadUrl,
            file_name: file.name,
            module_id: moduleId,
            submission_id: data.submission_id,
          }),
        });
      }

      setSuccess(true);
      setShowViolationModal(false);
      setPendingReview(null);
      toast.success("Module submitted successfully ✅");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      toast.error("Failed to submit module ❌");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || submitting || success) return;

    const code = effectiveCode.trim();
    const validation = missionSubmitSchema.safeParse({
      workDescription: code,
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0] ?? "workDescription");
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setError(Object.values(errors)[0] ?? "Please fix the errors below");
      return;
    }

    setFieldErrors({});
    setError(null);

    if (code && !file) {
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/missions/${moduleId}/pre-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.review?.hardware_violations?.length > 0) {
          setPendingReview(data.review as CodeReviewResult);
          setShowViolationModal(true);
          setSubmitting(false);
          return;
        }
      } catch {
        /* proceed with submit if pre-review fails */
      }
    }

    await performSubmit();
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
    <>
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
            value={externalCode ?? workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            disabled={disabled || submitting || !!externalCode}
            rows={8}
            aria-required
            aria-invalid={!!fieldErrors.workDescription}
            aria-describedby={
              fieldErrors.workDescription ? "work-description-error" : undefined
            }
            placeholder="// Sequential servo motion example&#10;servo1.write(90);&#10;delay(1000);&#10;servo2.write(45);"
            className="mt-2 border-cyan-500/20 bg-black/30 font-mono text-sm"
          />
          {fieldErrors.workDescription && (
            <p id="work-description-error" className="mt-1 text-sm text-red-400">
              {fieldErrors.workDescription}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="mission-file"
            className="font-display text-sm font-medium text-violet-300"
          >
            File upload (optional)
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            STL only — max 50 MB
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
                accept=".stl,model/stl"
                className="sr-only"
                disabled={disabled || submitting}
                aria-invalid={!!fieldErrors.file}
                aria-describedby={fieldErrors.file ? "mission-file-error" : undefined}
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  if (selected?.name.toLowerCase().endsWith(".stl")) {
                    void validateStlFile(selected);
                  } else {
                    setValidation(null);
                  }
                }}
              />
            </label>
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => {
                  setFile(null);
                  setValidation(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {fieldErrors.file && (
            <p id="mission-file-error" className="mt-1 text-sm text-red-400">
              {fieldErrors.file}
            </p>
          )}
        </div>

        {showDesignValidation && (validating || validation) && (
          <DesignValidatorWidget validation={validation} loading={validating} />
        )}

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <ButtonLoader
          type="submit"
          loading={submitting}
          disabled={disabled}
          className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
        >
          <Send className="size-4" aria-hidden />
          Submit for Review
        </ButtonLoader>
      </form>

      {showViolationModal && pendingReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="violation-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="size-6 shrink-0 text-amber-400"
                aria-hidden
              />
              <div>
                <h2
                  id="violation-modal-title"
                  className="font-display text-lg font-semibold text-amber-200"
                >
                  Potential hardware issue detected
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  AI found {pendingReview.hardware_violations.length}{" "}
                  hardware violation
                  {pendingReview.hardware_violations.length === 1 ? "" : "s"} in
                  your code. Are you sure you want to submit?
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {pendingReview.hardware_violations.map((v, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-amber-300">
                    [{v.type}]
                  </span>{" "}
                  {v.description}
                  {v.fix && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fix: {v.fix}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {pendingReview.issues.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Also found {pendingReview.issues.length} code issue
                {pendingReview.issues.length === 1 ? "" : "s"} (AI score:{" "}
                {pendingReview.score}/100)
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowViolationModal(false);
                  setPendingReview(null);
                }}
                disabled={submitting}
              >
                Go back and fix
              </Button>
              <Button
                type="button"
                onClick={() => void performSubmit()}
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-500"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  "Submit anyway"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
