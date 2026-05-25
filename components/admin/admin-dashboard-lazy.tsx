"use client";

import dynamic from "next/dynamic";

export const AdminDashboardLazy = dynamic(
  () =>
    import("@/components/admin/admin-dashboard-client").then(
      (m) => m.AdminDashboardClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6" aria-live="polite">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-zinc-800/50" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      </div>
    ),
  }
);
