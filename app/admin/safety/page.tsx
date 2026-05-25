import { Shield } from "lucide-react";

import { SafetyDashboardClient } from "@/components/admin/safety-dashboard-client";
import {
  fetchContentFilters,
  fetchPlagiarismReport,
  fetchSafetyFlags,
  fetchSafetyOverview,
  fetchSessionAnalytics,
} from "@/lib/safety/queries";

export default async function AdminSafetyPage() {
  const [overview, flags, plagiarism, filters, sessionStats] = await Promise.all([
    fetchSafetyOverview(),
    fetchSafetyFlags(),
    fetchPlagiarismReport(),
    fetchContentFilters(),
    fetchSessionAnalytics(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-orange-400/80">
          Sprint 7 · Safety & Moderation
        </p>
        <h1 className="font-display mt-1 flex items-center gap-3 text-3xl font-bold text-orange-300">
          <Shield className="size-8" aria-hidden />
          Safety Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Monitor content flags, plagiarism, session health, and content filters
          for students aged 9–16.
        </p>
      </div>

      <SafetyDashboardClient
        overview={overview}
        flags={flags}
        plagiarism={plagiarism}
        filters={filters}
        sessionStats={sessionStats}
      />
    </div>
  );
}
