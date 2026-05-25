"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === "development";

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-8 text-center shadow-2xl"
            role="alert"
          >
            <AlertTriangle
              className="mx-auto size-12 text-red-400"
              aria-hidden
            />
            <h2 className="font-display mt-4 text-xl font-semibold text-red-200">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We hit an unexpected error. You can try again or return to your
              dashboard.
            </p>
            {isDev && this.state.error && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-left font-mono text-[10px] text-red-300">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                onClick={this.reset}
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
            <a
              href="mailto:admin@konstrukt.io?subject=Error%20Report"
              className="mt-4 inline-block text-xs text-cyan-400 hover:underline"
            >
              Report this error
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function LayoutErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
