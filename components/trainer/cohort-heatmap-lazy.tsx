"use client";

import dynamic from "next/dynamic";

export const CohortHeatmapLazy = dynamic(
  () =>
    import("@/components/trainer/cohort-heatmap").then((m) => m.CohortHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-xl bg-zinc-800/50" aria-hidden />
    ),
  }
);
