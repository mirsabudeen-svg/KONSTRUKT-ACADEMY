"use client";

import { useState } from "react";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ReportButtonProps = {
  messageContent: string;
  moduleId: number;
  conversationId?: string | null;
};

const REPORT_TYPES = [
  "Inappropriate response",
  "Confusing/wrong answer",
  "Technical issue",
  "Other",
];

export function ReportButton({
  messageContent,
  moduleId,
  conversationId,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/safety/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: reportType,
          details,
          message_content: messageContent.slice(0, 500),
          module_id: moduleId,
          conversation_id: conversationId,
        }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          setOpen(false);
          setDone(false);
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-6 items-center justify-center rounded-full border border-amber-500/30 bg-zinc-900 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Report message"
      >
        <Flag className="size-3 text-amber-400" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-zinc-950 p-6">
            {done ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="size-10 text-emerald-400" />
                <p className="mt-3 font-medium text-emerald-300">
                  Thank you for your report!
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A trainer will review it soon.
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-lg font-semibold text-amber-200">
                  Report a concern
                </h2>
                <div className="mt-4 space-y-2">
                  {REPORT_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="report-type"
                        checked={reportType === type}
                        onChange={() => setReportType(type)}
                        className="accent-amber-500"
                      />
                      {type}
                    </label>
                  ))}
                </div>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Additional details (optional)"
                  className="mt-4 border-amber-500/20 bg-black/30 text-sm"
                  rows={3}
                />
                <div className="mt-4 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-500"
                    disabled={submitting}
                    onClick={() => void submit()}
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
