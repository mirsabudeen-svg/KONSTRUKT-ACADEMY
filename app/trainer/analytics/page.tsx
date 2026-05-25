import { BarChart3, Clock, Sparkles, TrendingUp, Users } from "lucide-react";

import { TrainerAnalyticsCharts } from "@/components/trainer/trainer-analytics-charts";
import { fetchTrainerAnalytics } from "@/lib/trainer/analytics";

export default async function TrainerAnalyticsPage() {
  const data = await fetchTrainerAnalytics();

  const statCards = [
    {
      label: "Students managed",
      value: String(data.studentsManaged),
      icon: Users,
      color: "text-violet-400",
    },
    {
      label: "Avg review time",
      value: `${data.averageReviewTimeHours}h`,
      icon: Clock,
      color: "text-cyan-400",
    },
    {
      label: "Approval rate",
      value: `${data.approvalRate}%`,
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Rejection rate",
      value: `${data.rejectionRate}%`,
      icon: BarChart3,
      color: "text-amber-400",
    },
    {
      label: "Avg score given",
      value: `${data.averageScoreGiven}/100`,
      icon: BarChart3,
      color: "text-violet-300",
    },
    {
      label: "Tokens refilled (month)",
      value: String(data.tokensRefilledThisMonth),
      icon: Sparkles,
      color: "text-cyan-300",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-400/80">
          Trainer Intelligence
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          Performance Analytics
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Track your review throughput, cohort progress, and student risk
          distribution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-violet-500/15 bg-card/50 p-5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <card.icon className={`size-5 ${card.color}`} aria-hidden />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
            </div>
            <p className="font-display mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <TrainerAnalyticsCharts data={data} />

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Recent activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.recentActivity.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm"
              >
                {item.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
