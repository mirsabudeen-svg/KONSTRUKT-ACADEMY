"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TokenPredictorProps = {
  cost?: number;
  actionLabel?: string;
  open: boolean;
  onProceed: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function TokenPredictor({
  cost = 1,
  actionLabel = "This action",
  open,
  onProceed,
  onCancel,
  loading = false,
}: TokenPredictorProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true);
    fetch("/api/hardware/check-tokens")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0))
      .catch(() => setBalance(0))
      .finally(() => setFetching(false));
  }, [open]);

  if (!open) return null;

  const remaining = balance ?? 0;
  const after = Math.max(0, remaining - cost);
  const depleted = remaining <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border p-6 shadow-2xl",
          depleted
            ? "border-red-500/30 bg-zinc-950"
            : "border-cyan-500/30 bg-zinc-950"
        )}
      >
        {fetching ? (
          <p className="text-sm text-muted-foreground">Checking tokens…</p>
        ) : depleted ? (
          <>
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-6 shrink-0 text-red-400" />
              <div>
                <h2 className="font-display text-lg font-semibold text-red-300">
                  No tokens remaining
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask your trainer to refill your token balance before using{" "}
                  {actionLabel.toLowerCase()}.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onCancel}>
                Close
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-500"
                onClick={() => {
                  window.location.href = "/settings";
                }}
              >
                Contact Trainer
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Zap className="size-6 shrink-0 text-cyan-400" />
              <div>
                <h2 className="font-display text-lg font-semibold text-cyan-200">
                  Token cost preview
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {actionLabel} costs{" "}
                  <span className="font-semibold text-cyan-300">
                    {cost} token{cost === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-lg border border-white/5 bg-black/30 p-4 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current balance</span>
                <span className="text-cyan-300">{remaining} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">After</span>
                <span className="text-emerald-300">{after} remaining</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                onClick={onProceed}
                disabled={loading}
              >
                {loading ? "Processing…" : "Proceed"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function useTokenBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/hardware/check-tokens")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0))
      .catch(() => setBalance(null));
  }, []);

  return balance;
}
