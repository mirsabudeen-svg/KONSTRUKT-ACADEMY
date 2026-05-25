import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PageLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-4",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="relative size-16">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
        <div className="absolute inset-2 flex items-center justify-center">
          <span className="font-display text-[10px] font-bold text-cyan-400">
            K
          </span>
        </div>
      </div>
      <p className="font-display text-sm tracking-widest text-cyan-400/80">
        {APP_NAME}
      </p>
      <p className="text-xs text-muted-foreground">Loading…</p>
    </div>
  );
}
