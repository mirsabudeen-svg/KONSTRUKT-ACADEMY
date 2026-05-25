"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Coins,
  FileText,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";

import type { AdminDashboardData } from "@/lib/admin/dashboard";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];

const EMPTY: AdminDashboardData = {
  totalStudents: 0,
  activeToday: 0,
  pendingSubmissions: 0,
  tokensUsed: 0,
  moduleCompletion: [],
  riskDistribution: [],
  recentActivity: [],
  systemAlerts: [],
};

export function AdminDashboardClient() {
  const [data, setData] = useState<AdminDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-orange-300">
            Intelligence Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide analytics · auto-refreshes every 60s
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
        <StatCard
          label="Students Total"
          value={data.totalStudents}
          icon={<Users className="size-5 text-orange-400" />}
        />
        <StatCard
          label="Active Today"
          value={data.activeToday}
          icon={<Activity className="size-5 text-emerald-400" />}
        />
        <StatCard
          label="Submissions Pending"
          value={data.pendingSubmissions}
          icon={<FileText className="size-5 text-amber-400" />}
        />
        <StatCard
          label="Tokens Used"
          value={data.tokensUsed}
          sub="this month"
          icon={<Coins className="size-5 text-cyan-400" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Module Completion">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.moduleCompletion}>
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
                  border: "1px solid #f9731640",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="rate" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Student Risk Levels">
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
                  const entry = props as {
                    level?: string;
                    count?: number;
                    name?: string;
                    value?: number;
                  };
                  return `${entry.level ?? entry.name}: ${entry.count ?? entry.value ?? 0}`;
                }}
              >
                {data.riskDistribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #f9731640",
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent Activity">
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {data.recentActivity.length === 0 ? (
              <li className="text-muted-foreground">No recent activity</li>
            ) : (
              data.recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-orange-500/10 bg-card/40 px-3 py-2"
                >
                  {item.message}
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="System Alerts">
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {data.systemAlerts.length === 0 ? (
              <li className="text-muted-foreground">No unresolved alerts</li>
            ) : (
              data.systemAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-red-300">
                      {alert.severity}
                    </span>
                    <p>{alert.message}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/cohorts"
          className={cn(buttonVariants({ variant: "outline" }), "border-orange-500/30 text-orange-300")}
        >
          Create Cohort
        </Link>
        <Link
          href="/admin/students"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-orange-500/30 text-orange-300")}
        >
          <UserPlus className="size-4" />
          Add Student
        </Link>
        <Link
          href="/admin/reports"
          className={cn(buttonVariants({ variant: "outline" }), "border-orange-500/30 text-orange-300")}
        >
          Export Report
        </Link>
        <Link
          href="/admin/students?role=trainer"
          className={cn(buttonVariants({ variant: "outline" }), "border-orange-500/30 text-orange-300")}
        >
          Manage Trainers
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-card/50 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-orange-200">
            {value}
          </p>
          {sub && (
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          )}
        </div>
        {icon}
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-card/50 p-4 backdrop-blur-sm">
      <h3 className="mb-4 font-display text-sm font-semibold text-orange-200">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-card/50 p-4 backdrop-blur-sm">
      <h3 className="mb-4 font-display text-sm font-semibold text-orange-200">
        {title}
      </h3>
      {children}
    </div>
  );
}
