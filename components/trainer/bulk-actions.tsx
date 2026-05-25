"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Megaphone,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BulkActionsProps = {
  selectedIds: string[];
  onClear: () => void;
  onComplete?: () => void;
};

export function BulkActionsToolbar({
  selectedIds,
  onClear,
  onComplete,
}: BulkActionsProps) {
  const [modal, setModal] = useState<
    "message" | "refill" | "approve" | null
  >(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const runAction = async (
    action: "message" | "refill" | "approve" | "export",
    payload?: { message?: string }
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          student_ids: selectedIds,
          payload,
        }),
      });

      if (action === "export") {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "students-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        onClear();
        onComplete?.();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Action failed");

      setModal(null);
      setMessage("");
      onClear();
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-3">
        <span className="text-sm font-medium text-cyan-200">
          {selectedIds.length} selected
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setModal("message")}
        >
          <Megaphone className="size-3.5" />
          Message All
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setModal("refill")}
        >
          <Sparkles className="size-3.5" />
          Refill Tokens
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setModal("approve")}
        >
          <CheckCircle2 className="size-3.5" />
          Bulk Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy}
          onClick={() => void runAction("export")}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-violet-500/25 bg-zinc-950 p-6">
            <h3 className="font-display text-lg font-semibold">
              {modal === "message" && "Message selected students"}
              {modal === "refill" &&
                `Refill tokens for ${selectedIds.length} students?`}
              {modal === "approve" &&
                `Approve all pending submissions from ${selectedIds.length} students?`}
            </h3>

            {modal === "message" && (
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Your message…"
                className="mt-4 border-violet-500/20 bg-black/40"
              />
            )}

            {modal === "approve" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Default score: 75, no feedback. This cannot be undone.
              </p>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy || (modal === "message" && !message.trim())}
                onClick={() => {
                  if (modal === "message") {
                    void runAction("message", { message });
                  } else if (modal === "refill") {
                    void runAction("refill");
                  } else {
                    void runAction("approve");
                  }
                }}
                className={cn(modal === "approve" && "bg-emerald-600 hover:bg-emerald-500")}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BulkSelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-violet-500/40 accent-violet-500"
      />
      {label}
    </label>
  );
}
