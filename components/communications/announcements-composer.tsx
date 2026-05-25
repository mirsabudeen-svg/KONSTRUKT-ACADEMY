"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";

import type { AnnouncementRow } from "@/lib/communications/announcements";
import { ButtonLoader } from "@/components/loading/button-loader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { announcementSchema } from "@/lib/validation/schemas";

export function AnnouncementsComposer() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [draftTopic, setDraftTopic] = useState("");
  const [history, setHistory] = useState<AnnouncementRow[]>([]);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/announcements");
    if (res.ok) {
      const json = await res.json();
      setHistory(json.announcements ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function aiDraft() {
    if (!draftTopic.trim()) return;
    setDrafting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", topic: draftTopic }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessage(json.draft ?? "");
        if (!title) setTitle(draftTopic.slice(0, 60));
      }
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    setFieldErrors({});
    const parsed = announcementSchema.safeParse({ title, message });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      toast.error("Please fix form errors ❌");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          title,
          message,
          send_whatsapp: sendWhatsapp,
          send_notification: sendNotification,
          scheduled_at: scheduledAt || null,
        }),
      });
      if (res.ok) {
        setTitle("");
        setMessage("");
        toast.success("Announcement sent ✅");
        await load();
      } else {
        toast.error("Failed to send announcement ❌");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-violet-300">
          Smart Announcements
        </h1>
        <p className="text-sm text-muted-foreground">
          Compose and send cohort announcements
        </p>
      </div>

      <div className="rounded-xl border border-violet-500/15 bg-card/50 p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            placeholder="AI draft topic…"
            value={draftTopic}
            onChange={(e) => setDraftTopic(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-violet-500/20 bg-background/50 px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            onClick={() => void aiDraft()}
            disabled={drafting}
            className="gap-2 border-violet-500/30"
          >
            <Sparkles className="size-4" />
            {drafting ? "Drafting…" : "AI Draft"}
          </Button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Announcement title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!fieldErrors.title}
            className="w-full rounded-lg border border-violet-500/20 bg-background/50 px-3 py-2 text-sm"
          />
          {fieldErrors.title && (
            <p className="text-xs text-red-400">{fieldErrors.title}</p>
          )}
          <Textarea
            placeholder="Message body…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            aria-invalid={!!fieldErrors.message}
            className="border-violet-500/20 bg-background/50"
          />
          {fieldErrors.message && (
            <p className="text-xs text-red-400">{fieldErrors.message}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
              In-app notification
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
              />
              WhatsApp to parents
            </label>
          </div>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="rounded-lg border border-violet-500/20 bg-background/50 px-3 py-2 text-sm"
          />
          <ButtonLoader
            onClick={() => void send()}
            loading={sending}
            disabled={!title || !message}
            className="gap-2 bg-violet-600 hover:bg-violet-500"
          >
            <Send className="size-4" />
            {scheduledAt ? "Schedule" : "Send Now"}
          </ButtonLoader>
        </div>
      </div>

      <div className="rounded-xl border border-violet-500/15 bg-card/50 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-violet-200">
          Announcement History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Sent</th>
                <th className="px-3 py-2">Reach</th>
                <th className="px-3 py-2">Channels</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                    No announcements yet
                  </td>
                </tr>
              ) : (
                history.map((a) => (
                  <tr key={a.id} className="border-t border-violet-500/10">
                    <td className="px-3 py-2">{a.title}</td>
                    <td className="px-3 py-2">
                      {a.sent_at
                        ? new Date(a.sent_at).toLocaleString()
                        : "Scheduled"}
                    </td>
                    <td className="px-3 py-2">{a.reach_count}</td>
                    <td className="px-3 py-2">
                      {a.send_notification ? "App" : ""}
                      {a.send_notification && a.send_whatsapp ? " + " : ""}
                      {a.send_whatsapp ? "WhatsApp" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
