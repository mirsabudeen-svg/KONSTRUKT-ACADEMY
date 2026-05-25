"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div
        className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-8 text-center shadow-2xl"
        role="alert"
      >
        <AlertTriangle className="mx-auto size-12 text-red-400" aria-hidden />
        <h1 className="font-display mt-4 text-xl font-semibold text-red-200">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We hit an unexpected error. Try again or return to your dashboard.
        </p>
        {isDev && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-left font-mono text-[10px] text-red-300">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            onClick={reset}
            className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            <RefreshCw className="size-4" aria-hidden />
            Try Again
          </Button>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Home className="size-4" aria-hidden />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
