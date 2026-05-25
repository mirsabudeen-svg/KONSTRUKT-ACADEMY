"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { MarkdownMessage } from "@/components/admin/markdown-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Campaign = {
  id: string;
  name: string;
  goal: string;
  target_audience: string;
  channels: string[];
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: string;
  plan_content: string | null;
  created_at: string;
};

const GOALS = [
  "Student Acquisition",
  "Retention",
  "Event Promotion",
  "Brand Awareness",
];

const AUDIENCES = ["Parents", "Students", "Schools"];
const CHANNELS = ["Instagram", "Facebook", "WhatsApp", "Email", "All"];

export function MaiaCampaignsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["All"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [generating, setGenerating] = useState(false);
  const [viewPlan, setViewPlan] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/maia/campaigns");
    if (res.ok) {
      const json = await res.json();
      setCampaigns(json.campaigns ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function toggleChannel(ch: string) {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function generatePlan() {
    if (!name.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/maia/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          target_audience: audience,
          channels: selectedChannels,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          budget: budget ? Number(budget) : undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setViewPlan({
          id: json.campaignId,
          name,
          goal,
          target_audience: audience,
          channels: selectedChannels,
          start_date: startDate || null,
          end_date: endDate || null,
          budget: budget ? Number(budget) : null,
          status: "planning",
          plan_content: json.plan,
          created_at: new Date().toISOString(),
        });
        void load();
      }
    } finally {
      setGenerating(false);
    }
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
          📣 Campaign Planner
        </h1>
      </div>

      <div className="rounded-xl border border-orange-500/15 bg-sidebar/40 p-6">
        <h2 className="mb-4 font-display text-sm font-semibold text-orange-300">
          Create Campaign
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Campaign name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-orange-500/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-8 w-full rounded-lg border border-orange-500/20 bg-background px-2 text-sm"
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Target audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="h-8 w-full rounded-lg border border-orange-500/20 bg-background px-2 text-sm"
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Budget (optional)</label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="border-orange-500/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Start date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-orange-500/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-orange-500/20"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-muted-foreground">Channels</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <Button
                key={ch}
                variant={selectedChannels.includes(ch) ? "default" : "outline"}
                size="xs"
                onClick={() => toggleChannel(ch)}
              >
                {ch}
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="mt-4 gap-2"
          disabled={generating || !name.trim()}
          onClick={() => void generatePlan()}
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate Campaign Plan
        </Button>
      </div>

      {viewPlan?.plan_content && (
        <div className="rounded-xl border border-orange-500/15 bg-black/20 p-6">
          <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
            Generated Plan: {viewPlan.name}
          </h2>
          <MarkdownMessage content={viewPlan.plan_content} />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-orange-300">
          Campaigns
        </h2>
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-orange-500/15 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-orange-200">{c.name}</span>
              <Badge variant="outline" className="capitalize">
                {c.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{c.goal}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(c.channels as string[])?.join(", ")} ·{" "}
              {c.start_date ?? "TBD"} – {c.end_date ?? "TBD"}
            </p>
            {c.plan_content && (
              <Button
                variant="ghost"
                size="xs"
                className="mt-2"
                onClick={() => setViewPlan(c)}
              >
                View plan
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
