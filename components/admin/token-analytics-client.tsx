"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Coins, RefreshCw } from "lucide-react";

import type { TokenAnalyticsData } from "@/lib/admin/tokens";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#F97316", "#06B6D4", "#8B5CF6", "#10B981"];

const EMPTY: TokenAnalyticsData = {
  totalDistributedThisMonth: 0,
  totalConsumedThisMonth: 0,
  avgTokensPerStudent: 0,
  mostTokenHungryModule: null,
  usageByType: [],
  dailyConsumption: [],
  topUsers: [],
  balanceDistribution: [],
  refillHistory: [],
  lowTokenStudents: [],
};

export function TokenAnalyticsClient() {
  const [data, setData] = useState<TokenAnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refilling, setRefilling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/token-analytics");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function bulkRefill() {
    setRefilling(true);
    try {
      await fetch("/api/admin/token-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_refill", threshold: 2, amount: 5 }),
      });
      await load();
    } finally {
      setRefilling(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            Token Economy
          </h1>
          <p className="text-sm text-muted-foreground">
            Usage analytics and refill management
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void load()}
          className="gap-2 text-orange-300"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Distributed (month)" value={data.totalDistributedThisMonth} />
        <MiniStat label="Consumed (month)" value={data.totalConsumedThisMonth} />
        <MiniStat label="Avg per student" value={data.avgTokensPerStudent} />
        <MiniStat
          label="Hungriest module"
          value={data.mostTokenHungryModule?.tokens ?? 0}
          sub={data.mostTokenHungryModule?.title}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartBox title="Usage by type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.usageByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={(p) => `${(p as { type?: string }).type}`}
              >
                {data.usageByType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#18181b", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Daily consumption (30 days)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.dailyConsumption}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#18181b", borderRadius: 8 }} />
              <Line type="monotone" dataKey="tokens" stroke="#F97316" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Top 10 token users">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topUsers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: "#94a3b8", fontSize: 9 }}
              />
              <Tooltip contentStyle={{ background: "#18181b", borderRadius: 8 }} />
              <Bar dataKey="tokens" fill="#F97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Token balance distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.balanceDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#18181b", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      <ChartBox title="Refill history">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Trainer</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.refillHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                    No refills logged yet
                  </td>
                </tr>
              ) : (
                data.refillHistory.map((row) => (
                  <tr key={row.id} className="border-t border-orange-500/10">
                    <td className="px-3 py-2">{row.trainerName}</td>
                    <td className="px-3 py-2">{row.studentName}</td>
                    <td className="px-3 py-2">+{row.amount}</td>
                    <td className="px-3 py-2">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChartBox>

      {data.lowTokenStudents.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-300">
              <Coins className="size-4" />
              <span className="font-semibold">
                {data.lowTokenStudents.length} students with low tokens (0–2)
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => void bulkRefill()}
              disabled={refilling}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {refilling ? "Refilling…" : "Bulk refill all low-token students"}
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2 text-sm">
            {data.lowTokenStudents.map((s) => (
              <li
                key={s.id}
                className="rounded-full border border-amber-500/30 bg-background/50 px-3 py-1"
              >
                {s.name} · {s.tokensRemaining} tokens
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-card/50 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-orange-200">
        {value}
      </p>
      {sub && <p className="truncate text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChartBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-card/50 p-4">
      <h3 className="mb-3 font-display text-sm font-semibold text-orange-200">
        {title}
      </h3>
      {children}
    </div>
  );
}
