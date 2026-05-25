"use client";

import dynamic from "next/dynamic";

export const MissionCelebrationGateLazy = dynamic(
  () =>
    import("@/components/progress/completion-celebration").then(
      (m) => m.MissionCelebrationGate
    ),
  { ssr: false }
);
