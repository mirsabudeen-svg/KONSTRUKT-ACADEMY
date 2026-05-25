import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gradient-to-r from-zinc-800 via-zinc-700/50 to-zinc-800 bg-[length:200%_100%]",
        className
      )}
      aria-hidden
    />
  );
}

export function MissionCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-card/40 p-4">
      <Shimmer className="h-4 w-24" />
      <Shimmer className="mt-3 h-6 w-3/4" />
      <Shimmer className="mt-2 h-3 w-full" />
      <Shimmer className="mt-4 h-8 w-20 rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <Shimmer className="h-24 w-full rounded-xl" />
      <div>
        <Shimmer className="h-4 w-32" />
        <Shimmer className="mt-2 h-10 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-4 py-8 md:gap-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <Shimmer key={i} className="size-12 rounded-full md:size-14" />
        ))}
      </div>
    </div>
  );
}

export function SubmissionCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-3">
        <Shimmer className="size-10 rounded-full" />
        <div className="flex-1">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="mt-2 h-3 w-48" />
        </div>
      </div>
      <Shimmer className="mt-4 h-20 w-full" />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-32 w-24 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Shimmer key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="grid grid-cols-6 gap-1 sm:grid-cols-10" aria-busy="true">
      {Array.from({ length: 60 }).map((_, i) => (
        <Shimmer key={i} className="aspect-square rounded-sm" />
      ))}
    </div>
  );
}

export function BadgeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <Shimmer key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}

export function MissionDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-8" aria-busy="true">
      <Shimmer className="h-8 w-32" />
      <Shimmer className="h-48 w-full rounded-2xl" />
      <Shimmer className="h-64 w-full rounded-xl" />
      <Shimmer className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Shimmer className="h-64 w-full rounded-xl" />
      <HeatmapSkeleton />
    </div>
  );
}
