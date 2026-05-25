"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send } from "lucide-react";

import type { CommunicationHubData } from "@/lib/communications/hub";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminCommunicationsClient() {
  const [data, setData] = useState<CommunicationHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateBody, setTemplateBody] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/communications");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    action: "weekly_reports" | "retry_failed",
    label: string
  ) {
    setActing(label);
    try {
      await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  async function saveTemplate(id: string) {
    await fetch("/api/admin/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_template",
        template_id: id,
        body_template: templateBody,
      }),
    });
    setEditingTemplate(null);
    await load();
  }

  if (!data) {
    return (
      <p className="text-muted-foreground">
        {loading ? "Loading…" : "Unable to load communication hub"}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            Communication Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp, parent portal, and announcements
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

      <section className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-orange-200">
          <MessageSquare className="size-5" />
          WhatsApp Stats
        </h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-4">
          <MiniStat label="Today" value={data.whatsapp.sentToday} />
          <MiniStat label="This week" value={data.whatsapp.sentThisWeek} />
          <MiniStat label="This month" value={data.whatsapp.sentThisMonth} />
          <MiniStat
            label="Delivery rate"
            value={`${data.whatsapp.deliveryRate}%`}
          />
        </div>
        {data.whatsapp.failedMessages.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm text-red-300">Failed messages</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {data.whatsapp.failedMessages.map((m) => (
                <li key={m.id} className="rounded bg-red-500/5 px-2 py-1">
                  {m.messageType} → {m.whatsappNumber}: {m.messageBody}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={acting === "retry"}
          onClick={() => void runAction("retry_failed", "retry")}
          className="border-orange-500/30"
        >
          Retry failed
        </Button>
      </section>

      <section className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-orange-200">
          Weekly Reports
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Last sent:{" "}
          {data.weeklyReports.lastSent
            ? new Date(data.weeklyReports.lastSent).toLocaleString()
            : "Never"}
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Next scheduled: {data.weeklyReports.nextScheduled ?? "—"}
        </p>
        <Button
          onClick={() => void runAction("weekly_reports", "weekly")}
          disabled={acting === "weekly"}
          className="gap-2 bg-orange-600 hover:bg-orange-500"
        >
          <Send className="size-4" />
          {acting === "weekly" ? "Sending…" : "Send Now to All"}
        </Button>
      </section>

      <section className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-orange-200">
          Parent Portal Stats
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniStat
            label="Active portal links"
            value={data.parentPortal.activeLinks}
          />
          <MiniStat
            label="Views this week"
            value={data.parentPortal.viewsThisWeek}
          />
        </div>
      </section>

      <section className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-orange-200">
          Message Templates
        </h2>
        <div className="space-y-4">
          {data.templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-orange-500/10 bg-black/20 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-orange-200">{t.title}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingTemplate(t.id);
                    setTemplateBody(t.bodyTemplate);
                  }}
                >
                  Edit
                </Button>
              </div>
              {editingTemplate === t.id ? (
                <div className="space-y-2">
                  <textarea
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    rows={6}
                    className="w-full rounded border border-orange-500/20 bg-background/50 p-2 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={() => void saveTemplate(t.id)}
                    className="bg-orange-600"
                  >
                    Save template
                  </Button>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {t.bodyTemplate.slice(0, 200)}…
                </pre>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-orange-200">
          Announcement History
        </h2>
        <ul className="space-y-2 text-sm">
          {data.announcements.length === 0 ? (
            <li className="text-muted-foreground">No announcements sent yet</li>
          ) : (
            data.announcements.map((a) => (
              <li
                key={a.id}
                className="flex justify-between rounded border border-orange-500/10 px-3 py-2"
              >
                <span>{a.title}</span>
                <span className="text-muted-foreground">
                  {a.reachCount} reached ·{" "}
                  {a.sentAt ? new Date(a.sentAt).toLocaleDateString() : "—"}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-orange-500/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-orange-200">{value}</p>
    </div>
  );
}
