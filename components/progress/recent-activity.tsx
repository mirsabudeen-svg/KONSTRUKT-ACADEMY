import { Activity } from "lucide-react";

import type { ActivityItem } from "@/lib/progress/activity";

type RecentActivityProps = {
  items: ActivityItem[];
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <section className="rounded-2xl border border-cyan-500/15 bg-card/40 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="size-5 text-cyan-400" aria-hidden />
        <h2 className="font-display text-lg font-semibold text-cyan-200">
          Recent Activity
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recent activity yet. Complete your first mission to see updates here.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm"
            >
              <span className="text-foreground">{item.message}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {item.relative}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
