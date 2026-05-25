"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function PageError({
  title = "Failed to load content",
  message = "Something went wrong while fetching data. Please try again.",
  onRetry,
}: PageErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-12 text-center"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="size-10 text-amber-400" aria-hidden />
      <h2 className="font-display mt-4 text-lg font-semibold text-amber-200">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex gap-3">
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
        )}
        <a
          href="mailto:admin@konstrukt.io"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
