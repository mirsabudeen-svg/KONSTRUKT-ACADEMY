import { BadgeGridSkeleton } from "@/components/loading/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-20 animate-pulse rounded-xl bg-zinc-800/50" />
      <BadgeGridSkeleton />
    </div>
  );
}
