import { DashboardSkeleton, HeatmapSkeleton } from "@/components/loading/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <DashboardSkeleton />
      <HeatmapSkeleton />
    </div>
  );
}
