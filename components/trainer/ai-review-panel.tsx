"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiReviewSummaryResponse } from "@/lib/trainer/student-detail";
import { cn } from "@/lib/utils";

type AiReviewPanelProps = {
  submissionId: string;
  isPending: boolean;
  onUseFeedback: (text: string, score?: number) => void;
  onAgreeWithAi: (score: number, feedback: string) => void;
  onOpen?: () => void;
};

export function AiReviewPanel({
  submissionId,
  isPending,
  onUseFeedback,
  onAgreeWithAi,
  onOpen,
}: AiReviewPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [review, setReview] = useState<AiReviewSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void fetch(
      `/api/trainer/ai-review-summary?submission_id=${submissionId}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setReview(data?.review ?? null))
      .catch(() => setReview(null))
      .finally(() => setLoading(false));

    void fetch(`/api/trainer/submissions/${submissionId}/open`, {
      method: "POST",
    }).catch(() => undefined);

    onOpen?.();
  }, [submissionId, isPending, onOpen]);

  if (!isPending) return null;

  const suggestedFeedback = [
    review?.positiveFeedback,
    ...(review?.suggestions ?? []),
    review?.summary,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-950/20">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-violet-200">
          <Sparkles className="size-4" />
          AI Pre-Review
          {review?.aiScore != null && (
            <span className="font-mono text-cyan-300">
              {review.aiScore}/100
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-violet-500/10 px-4 py-3 text-sm">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading AI review…
            </div>
          )}

          {!loading && !review && (
            <p className="text-muted-foreground">No AI review available yet.</p>
          )}

          {review && (
            <>
              <div className="space-y-1">
                {review.hardwareViolations.length === 0 ? (
                  <p className="flex items-center gap-1 text-emerald-300">
                    <Check className="size-3.5" />
                    Sequential motion: Pass
                  </p>
                ) : (
                  review.hardwareViolations.map((v, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-1 text-red-300"
                    >
                      <X className="mt-0.5 size-3.5 shrink-0" />
                      {v.type}: {v.description}
                      {v.description.toLowerCase().includes("line") ? "" : ""}
                    </p>
                  ))
                )}

                {review.issues
                  .filter((issue) => issue.severity !== "info")
                  .slice(0, 4)
                  .map((issue, i) => (
                    <p
                      key={i}
                      className={cn(
                        "flex items-start gap-1",
                        issue.severity === "error"
                          ? "text-red-300"
                          : "text-amber-300"
                      )}
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      {issue.line > 0 && `Line ${issue.line}: `}
                      {issue.message}
                    </p>
                  ))}
              </div>

              {suggestedFeedback && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested feedback
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-violet-100/90">
                    {suggestedFeedback}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedFeedback && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-violet-500/30"
                    onClick={() => onUseFeedback(suggestedFeedback, review.aiScore ?? undefined)}
                  >
                    Use Suggested Feedback
                  </Button>
                )}
                {review.aiScore != null && review.passed && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    onClick={() =>
                      onAgreeWithAi(
                        review.aiScore ?? 75,
                        suggestedFeedback || "Great work!"
                      )
                    }
                  >
                    Agree with AI
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
