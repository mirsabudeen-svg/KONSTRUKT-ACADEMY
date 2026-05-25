"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AnalyticsData = {
  contentThisMonth: number;
  broadcastsSent: number;
  conversionRate: number;
  enquiries: {
    id: string;
    source: string | null;
    contact_name: string | null;
    notes: string | null;
    converted: boolean;
    created_at: string;
  }[];
  contentByType: { type: string; count: number }[];
  monthlyVolume: { month: string; count: number }[];
  enquiriesBySource: { source: string; count: number }[];
  topTemplates: { key: string; label: string; platform: string }[];
};

const PIE_COLORS = ["#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412"];

export function MaiaAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [source, setSource] = useState("Instagram");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/maia/analytics");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function addEnquiry() {
    await fetch("/api/admin/maia/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        contact_name: contactName,
        notes,
        converted: false,
      }),
    });
    setContactName("");
    setNotes("");
    void load();
  }

  async function markConverted(id: string) {
    await fetch("/api/admin/maia/analytics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, converted: true }),
    });
    void load();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/maia"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-300"
        >
          <ArrowLeft className="size-3" />
          Back to MAIA
        </Link>
        <h1 className="font-display text-2xl font-bold text-orange-300">
          📊 Marketing Analytics
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Content this month" value={data?.contentThisMonth ?? 0} />
        <MetricCard label="Broadcasts sent" value={data?.broadcastsSent ?? 0} />
        <MetricCard label="Enquiries tracked" value={data?.enquiries?.length ?? 0} />
        <MetricCard
          label="Conversion rate"
          value={`${data?.conversionRate ?? 0}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Enquiries by source">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data?.enquiriesBySource ?? []}
                dataKey="count"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {(data?.enquiriesBySource ?? []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly content volume">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.monthlyVolume ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#fb923c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-orange-500/15 p-4">
        <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
          Track Enquiry
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-8 rounded-lg border border-orange-500/20 bg-background px-2 text-sm"
          >
            {["Instagram", "WhatsApp", "Referral", "Facebook", "Email", "Other"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </select>
          <Input
            placeholder="Contact name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="border-orange-500/20"
          />
          <Button onClick={() => void addEnquiry()}>Add Enquiry</Button>
        </div>
        <Textarea
          placeholder="Notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 border-orange-500/20"
        />
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-sm font-semibold text-orange-300">
          Recent Enquiries
        </h2>
        {(data?.enquiries ?? []).slice(0, 20).map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-orange-500/10 p-3 text-sm"
          >
            <Badge variant="outline">{e.source ?? "unknown"}</Badge>
            <span>{e.contact_name ?? "Anonymous"}</span>
            <span className="text-xs text-muted-foreground">{e.notes}</span>
            {e.converted ? (
              <Badge className="ml-auto bg-emerald-500/20 text-emerald-300">
                Converted
              </Badge>
            ) : (
              <Button
                size="xs"
                variant="outline"
                className="ml-auto"
                onClick={() => void markConverted(e.id)}
              >
                Mark converted
              </Button>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold text-orange-300">
          Popular Templates
        </h2>
        <div className="flex flex-wrap gap-2">
          {(data?.topTemplates ?? []).map((t) => (
            <Badge key={t.key} variant="outline">
              {t.label} ({t.platform})
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-sidebar/40 p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-2xl text-orange-300">{value}</p>
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
    <div className="rounded-xl border border-orange-500/15 bg-sidebar/40 p-4">
      <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
        {title}
      </h2>
      {children}
    </div>
  );
}
