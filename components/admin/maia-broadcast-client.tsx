"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ContentOption = {
  id: string;
  title: string | null;
  content_type: string;
  platform: string | null;
};

type BroadcastResult = {
  sent: number;
  failed: number;
  skipped: number;
};

export function MaiaBroadcastClient() {
  const [contentOptions, setContentOptions] = useState<ContentOption[]>([]);
  const [contentId, setContentId] = useState("");
  const [contactsRaw, setContactsRaw] = useState("");
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/maia/broadcast");
    if (res.ok) {
      const json = await res.json();
      setContentOptions(json.items ?? []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    async function loadPreview() {
      if (!contentId) {
        setPreview("");
        return;
      }
      const res = await fetch(`/api/admin/maia/content?search=`);
      if (res.ok) {
        const json = await res.json();
        const item = (json.items ?? []).find(
          (i: { id: string; content: string }) => i.id === contentId
        );
        setPreview(item?.content ?? "");
      }
    }
    void loadPreview();
  }, [contentId]);

  function parseContacts(): string[] {
    return contactsRaw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function sendBroadcast() {
    const contacts = parseContacts();
    if (!contentId || contacts.length === 0) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/maia/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId, contacts }),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/maia"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-300"
        >
          <ArrowLeft className="size-3" />
          Back to MAIA
        </Link>
        <h1 className="font-display text-2xl font-bold text-orange-300">
          📡 Marketing Broadcasts
        </h1>
        <p className="text-sm text-muted-foreground">
          Send MAIA content to prospect contacts (excludes enrolled student parents)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-orange-500/15 p-4">
          <div>
            <label className="text-xs text-muted-foreground">
              Select content from library
            </label>
            <select
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-orange-500/20 bg-background px-2 text-sm"
            >
              <option value="">Choose content...</option>
              {contentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title ?? c.content_type} ({c.platform})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Contact list (CSV paste — one number per line)
            </label>
            <Textarea
              value={contactsRaw}
              onChange={(e) => setContactsRaw(e.target.value)}
              rows={8}
              placeholder="+919876543210&#10;+919876543211"
              className="mt-1 border-orange-500/20 font-mono text-sm"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {parseContacts().length} contacts parsed
            </p>
          </div>

          <Button
            className="gap-2"
            disabled={sending || !contentId || parseContacts().length === 0}
            onClick={() => void sendBroadcast()}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send Now
          </Button>

          {result && (
            <div className="rounded-lg bg-orange-500/10 p-3 text-sm">
              <p>Sent: {result.sent}</p>
              <p>Failed: {result.failed}</p>
              <p>Skipped (existing students): {result.skipped}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-orange-500/15 p-4">
          <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
            Message Preview
          </h2>
          <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-sm text-orange-100">
            {preview || "Select content to preview"}
          </pre>
        </div>
      </div>
    </div>
  );
}
