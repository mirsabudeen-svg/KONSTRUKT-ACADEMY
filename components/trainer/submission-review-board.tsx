"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Download, FileBox, Loader2, Sparkles, X } from "lucide-react";

import { NoSubmissions } from "@/components/empty/empty-state";
import { AiReviewPanel } from "@/components/trainer/ai-review-panel";
import {
  BulkActionsToolbar,
  BulkSelectCheckbox,
} from "@/components/trainer/bulk-actions";
import { TrainerNotes } from "@/components/trainer/trainer-notes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import type { SubmissionStatus } from "@/lib/db/types";
import {
  formatSubmittedAgo,
  parseSubmissionContent,
  submissionTypeLabel,
} from "@/lib/missions/submission-display";
import type { TrainerSubmissionRow } from "@/lib/trainer/submissions";
import {
  reviewApproveSchema,
  reviewRejectSchema,
} from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

type FilterTab = "all" | SubmissionStatus;

type ReviewModalState = {
  submission: TrainerSubmissionRow;
  action: "approve" | "reject";
} | null;

type SubmissionReviewBoardProps = {
  initialSubmissions: TrainerSubmissionRow[];
};

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export function SubmissionReviewBoard({
  initialSubmissions,
}: SubmissionReviewBoardProps) {
  const router = useRouter();
  const toast = useToast();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [modal, setModal] = useState<ReviewModalState>(null);
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );

  const filtered = useMemo(() => {
    if (filter === "all") return submissions;
    return submissions.filter((s) => s.status === filter);
  }, [submissions, filter]);

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  const visibleStudentIds = useMemo(
    () => [...new Set(filtered.map((s) => s.studentId))],
    [filtered]
  );

  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const openModal = (
    submission: TrainerSubmissionRow,
    action: "approve" | "reject",
    prefill?: { feedback?: string; score?: number }
  ) => {
    setModal({ submission, action });
    setScore(prefill?.score ?? submission.aiPreScore ?? 85);
    setFeedback(
      prefill?.feedback ??
        (submission.codeReview?.suggestions?.length
          ? submission.codeReview.suggestions.join("\n")
          : "")
    );
    setError(null);
  };

  const closeModal = () => {
    if (submitting) return;
    setModal(null);
    setError(null);
  };

  const submitReview = async (
    submission: TrainerSubmissionRow,
    action: "approve" | "reject",
    reviewFeedback: string,
    reviewScore?: number
  ) => {
    const res = await fetch("/api/trainer/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submission_id: submission.id,
        action,
        feedback: reviewFeedback.trim(),
        score: action === "approve" ? reviewScore : undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Review failed");

    const newStatus: SubmissionStatus =
      action === "approve" ? "approved" : "rejected";

    setSubmissions((current) =>
      current.map((s) =>
        s.id === submission.id
          ? {
              ...s,
              status: newStatus,
              feedback: reviewFeedback.trim() || s.feedback,
              score: action === "approve" ? reviewScore ?? s.score : s.score,
              reviewedAt: new Date().toISOString(),
            }
          : s
      )
    );
  };

  const handleConfirm = async () => {
    if (!modal) return;

    if (modal.action === "approve") {
      const parsed = reviewApproveSchema.safeParse({ score, feedback });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid score");
        return;
      }
    } else {
      const parsed = reviewRejectSchema.safeParse({ feedback });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Feedback required");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitReview(
        modal.submission,
        modal.action,
        feedback,
        modal.action === "approve" ? score : undefined
      );
      if (modal.action === "approve") {
        toast.xp(`Submission approved — ${score} XP awarded ⚡`);
      } else {
        toast.success("Submission rejected with feedback");
      }
      setModal(null);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Review failed";
      setError(msg);
      toast.error("Failed to submit review ❌");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgreeWithAi = async (
    submission: TrainerSubmissionRow,
    aiScore: number,
    aiFeedback: string
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(submission, "approve", aiFeedback, aiScore);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BulkActionsToolbar
        selectedIds={[...selectedStudentIds]}
        onClear={() => setSelectedStudentIds(new Set())}
        onComplete={() => router.refresh()}
      />

      <div className="flex flex-wrap items-center gap-4">
        <BulkSelectCheckbox
          checked={
            visibleStudentIds.length > 0 &&
            visibleStudentIds.every((id) => selectedStudentIds.has(id))
          }
          indeterminate={
            selectedStudentIds.size > 0 &&
            !visibleStudentIds.every((id) => selectedStudentIds.has(id))
          }
          onChange={(checked) => {
            if (checked) {
              setSelectedStudentIds(new Set(visibleStudentIds));
            } else {
              setSelectedStudentIds(new Set());
            }
          }}
          label="Select visible students"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === tab.id
                ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                : "border-white/10 text-muted-foreground hover:bg-white/5"
            )}
          >
            {tab.label}
            {tab.id === "pending" && pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <NoSubmissions />
      ) : (
        <ul className="space-y-4">
          {filtered.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              selected={selectedStudentIds.has(submission.studentId)}
              onSelect={(checked) =>
                toggleStudent(submission.studentId, checked)
              }
              onApprove={() => openModal(submission, "approve")}
              onReject={() => openModal(submission, "reject")}
              onUseFeedback={(text, aiScore) =>
                openModal(submission, "approve", {
                  feedback: text,
                  score: aiScore,
                })
              }
              onAgreeWithAi={(aiScore, text) =>
                void handleAgreeWithAi(submission, aiScore, text)
              }
              submitting={submitting}
            />
          ))}
        </ul>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onKeyDown={(e) => e.key === "Escape" && closeModal()}
        >
          <div className="flex h-full w-full flex-col overflow-y-auto border-violet-500/25 bg-zinc-950 p-6 shadow-2xl md:h-auto md:max-w-lg md:rounded-2xl md:border">
            <h2
              id="review-modal-title"
              className="font-display text-xl font-semibold"
            >
              {modal.action === "approve"
                ? "Approve submission"
                : "Reject submission"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {modal.submission.studentName} · Mission{" "}
              {modal.submission.moduleId} — {modal.submission.moduleTitle}
            </p>

            {modal.action === "approve" && (
              <div className="mt-6">
                <label
                  htmlFor="review-score"
                  className="text-sm font-medium text-emerald-300"
                >
                  Score: {score}/100
                </label>
                <input
                  id="review-score"
                  type="range"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="mt-2 w-full accent-emerald-500"
                />
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="review-feedback"
                className="text-sm font-medium text-muted-foreground"
              >
                {modal.action === "approve"
                  ? "Trainer feedback (optional)"
                  : "Trainer feedback (required)"}
              </label>
              <Textarea
                id="review-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="AI suggested feedback (edit as needed)…"
                className="mt-2 border-violet-500/20 bg-black/40"
              />
            </div>

            <div className="mt-4">
              <TrainerNotes studentId={modal.submission.studentId} compact />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className={cn(
                  "gap-2",
                  modal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                )}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : modal.action === "approve" ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <X className="size-4" aria-hidden />
                )}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  submission,
  selected,
  onSelect,
  onApprove,
  onReject,
  onUseFeedback,
  onAgreeWithAi,
  submitting,
}: {
  submission: TrainerSubmissionRow;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onUseFeedback: (text: string, score?: number) => void;
  onAgreeWithAi: (score: number, feedback: string) => void;
  submitting: boolean;
}) {
  const preview = parseSubmissionContent(
    submission.submissionType,
    submission.contentUrl
  );
  const isPending = submission.status === "pending";

  return (
    <li className="rounded-xl border border-violet-500/15 bg-card/50 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-3 size-4 rounded border-violet-500/40 accent-violet-500"
            aria-label={`Select ${submission.studentName}`}
          />
          <Avatar className="size-10 ring-2 ring-violet-500/30">
            {submission.studentAvatarUrl && (
              <AvatarImage
                src={submission.studentAvatarUrl}
                alt={submission.studentName}
              />
            )}
            <AvatarFallback className="bg-violet-500/20 text-violet-200">
              {submission.studentName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{submission.studentName}</p>
            <p className="text-sm text-muted-foreground">
              Mission {submission.moduleId}: {submission.moduleTitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                {submission.badgeName}
              </Badge>
              <Badge variant="outline">
                {submissionTypeLabel(submission.submissionType)}
              </Badge>
              <StatusBadge status={submission.status} />
              {submission.aiPreScore != null && (
                <Badge
                  variant="outline"
                  className="gap-1 border-violet-500/40 bg-violet-500/10 font-mono text-violet-200"
                >
                  <Sparkles className="size-3" aria-hidden />
                  AI {submission.aiPreScore}/100
                </Badge>
              )}
              {submission.aiWarning && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-300"
                >
                  <AlertTriangle className="size-3" aria-hidden />
                  {submission.codeReview?.hardwareViolationCount ?? 1} hardware
                  violation
                  {(submission.codeReview?.hardwareViolationCount ?? 1) === 1
                    ? ""
                    : "s"}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatSubmittedAgo(submission.submittedAt)}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onApprove}
              disabled={submitting}
              className="gap-1 bg-emerald-600 hover:bg-emerald-500"
            >
              <Check className="size-4" aria-hidden />
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={submitting}
              className="gap-1 border-red-500/40 text-red-300 hover:bg-red-500/10"
            >
              <X className="size-4" aria-hidden />
              Reject
            </Button>
          </div>
        )}
      </div>

      <AiReviewPanel
        submissionId={submission.id}
        isPending={isPending}
        onUseFeedback={onUseFeedback}
        onAgreeWithAi={onAgreeWithAi}
      />

      {submission.trainerNotes && isPending && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">
            AI notes for trainer
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs">
            {submission.trainerNotes}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-white/5 bg-black/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        {preview.kind === "stl" ? (
          <div className="mt-2 flex items-center gap-3">
            <FileBox className="size-5 text-violet-400" aria-hidden />
            <span className="text-sm">STL File</span>
            {preview.fileUrl && (
              <a
                href={preview.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
              >
                <Download className="size-3.5" aria-hidden />
                Download
              </a>
            )}
          </div>
        ) : (
          <pre
            className={cn(
              "mt-2 max-h-48 overflow-auto text-xs leading-relaxed",
              preview.kind === "code" || preview.kind === "json"
                ? "font-mono text-cyan-100/90"
                : "text-muted-foreground"
            )}
          >
            {preview.content}
          </pre>
        )}
      </div>

      {submission.feedback && submission.status !== "pending" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Feedback: {submission.feedback}
          {submission.score != null && (
            <span className="ml-2 font-mono text-emerald-400">
              · {submission.score}/100
            </span>
          )}
        </p>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const styles: Record<SubmissionStatus, string> = {
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    rejected: "border-red-500/40 bg-red-500/10 text-red-300",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  );
}
