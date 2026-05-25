"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrainerAnalyticsData } from "@/lib/trainer/analytics";

const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];

type TrainerAnalyticsChartsProps = {
  data: TrainerAnalyticsData;
};

export function TrainerAnalyticsCharts({ data }: TrainerAnalyticsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Submissions reviewed per day">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.submissionsPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #7c3aed40",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Module completion rate across cohort">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.moduleCompletionRates}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="moduleId"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(v) => `M${v}`}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #06b6d440",
                borderRadius: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#06B6D4"
              strokeWidth={2}
              dot={{ fill: "#06B6D4" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Score distribution">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.scoreDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #10b98140",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Student risk levels">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data.riskDistribution}
              dataKey="count"
              nameKey="level"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(props) => {
                const entry = props as { level?: string; count?: number; name?: string; value?: number };
                const label = entry.level ?? entry.name ?? "";
                const count = entry.count ?? entry.value ?? 0;
                return `${label}: ${count}`;
              }}
            >
              {data.riskDistribution.map((_, index) => (
                <Cell
                  key={index}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #f59e0b40",
                borderRadius: 8,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-violet-500/15 bg-card/50 p-4 backdrop-blur-sm">
      <h3 className="mb-4 font-display text-sm font-semibold text-violet-200">
        {title}
      </h3>
      {children}
    </div>
  );
}
