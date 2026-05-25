"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Save, Send } from "lucide-react";

import { MarkdownMessage } from "@/components/admin/markdown-message";
import { MAIA_TEMPLATES } from "@/lib/maia/templates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  templateKey?: string;
};

type ContentItem = {
  id: string;
  title: string | null;
  content_type: string;
  platform: string | null;
  created_at: string;
};

const TEMPLATE_BUTTONS = [
  { key: "instagram_post", emoji: "📱", label: "Instagram" },
  { key: "whatsapp_broadcast", emoji: "💬", label: "WhatsApp" },
  { key: "admission_email", emoji: "📧", label: "Email" },
  { key: "batch_announcement", emoji: "📢", label: "Announcement" },
  { key: "school_partnership", emoji: "🏫", label: "School Letter" },
  { key: "facebook_ad", emoji: "📊", label: "Ad" },
];

export function MaiaChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm ready to help grow KONSTRUKT Academy. What content shall we create today? Use quick templates or describe exactly what you need.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadContent = useCallback(async () => {
    const res = await fetch("/api/admin/maia/content?status=all");
    if (res.ok) {
      const json = await res.json();
      setRecentContent((json.items ?? []).slice(0, 5));
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string, templateKey?: string) {
    if (!text.trim() || busy) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      templateKey,
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin/maia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationId,
          campaign_type: templateKey,
        }),
      });

      const convId = res.headers.get("X-Conversation-Id");
      if (convId) setConversationId(convId);

      if (!res.ok) {
        const err = await res.json();
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: `Error: ${err.error ?? "Request failed"}`,
                  streaming: false,
                }
              : msg
          )
        );
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId ? { ...msg, content: full } : msg
          )
        );
      }

      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: full, streaming: false, templateKey }
            : msg
        )
      );
      setEditContent((e) => ({ ...e, [assistantId]: full }));
    } catch (err) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: `Error: ${err instanceof Error ? err.message : "Failed"}`,
                streaming: false,
              }
            : msg
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveToLibrary(msg: ChatMessage) {
    const content = editContent[msg.id] ?? msg.content;
    const template = msg.templateKey
      ? MAIA_TEMPLATES[msg.templateKey]
      : null;

    await fetch("/api/admin/maia/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: template?.contentType ?? "announcement",
        platform: template?.platform ?? "multi",
        title: template?.label ?? "MAIA Generated Content",
        content,
        tone: "professional",
        target_audience: "parents",
        status: "draft",
      }),
    });
    void loadContent();
  }

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportCsv() {
    const rows = [["title", "type", "platform", "created"]];
    for (const item of recentContent) {
      rows.push([
        item.title ?? "",
        item.content_type,
        item.platform ?? "",
        item.created_at,
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maia-content.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-orange-300">
          🎯 MAIA — Marketing AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Your AI-powered marketing team
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-h-[480px] flex-col rounded-xl border border-orange-500/15 bg-sidebar/40 lg:col-span-2">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg p-3",
                  msg.role === "user"
                    ? "ml-8 bg-orange-500/10"
                    : "mr-8 border border-orange-500/10 bg-black/20"
                )}
              >
                <div className="mb-1 text-[10px] uppercase tracking-wider text-orange-400">
                  {msg.role === "user" ? "Admin" : "MAIA"}
                </div>
                {msg.streaming && !msg.content ? (
                  <Loader2 className="size-5 animate-spin text-orange-400" />
                ) : msg.role === "assistant" && editContent[msg.id] !== undefined ? (
                  <Textarea
                    value={editContent[msg.id] ?? msg.content}
                    onChange={(e) =>
                      setEditContent((prev) => ({
                        ...prev,
                        [msg.id]: e.target.value,
                      }))
                    }
                    rows={8}
                    className="border-orange-500/20 font-sans text-sm"
                  />
                ) : (
                  <MarkdownMessage content={msg.content} />
                )}
                {msg.role === "assistant" && !msg.streaming && msg.content && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        void copyMessage(
                          msg.id,
                          editContent[msg.id] ?? msg.content
                        )
                      }
                    >
                      {copiedId === msg.id ? (
                        <Check className="size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => void saveToLibrary(msg)}
                    >
                      <Save className="size-3" />
                      Save to Library
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-orange-500/10 p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {TEMPLATE_BUTTONS.map((t) => (
                <Button
                  key={t.key}
                  variant="outline"
                  size="xs"
                  disabled={busy}
                  onClick={() => {
                    const template = MAIA_TEMPLATES[t.key];
                    void sendMessage(template.prompt, t.key);
                  }}
                >
                  {t.emoji} {t.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you need..."
                rows={2}
                className="min-h-0 resize-none border-orange-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              <Button
                disabled={busy || !input.trim()}
                onClick={() => void sendMessage(input)}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-orange-500/15 bg-sidebar/40 p-4">
          <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
            Content Library
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">Recent Generated:</p>
          <ul className="mb-4 space-y-2 text-sm">
            {recentContent.map((item) => (
              <li key={item.id} className="rounded-lg bg-orange-500/5 p-2">
                <p className="font-medium text-orange-200">
                  {item.title ?? item.content_type}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()} ·{" "}
                  {item.platform}
                </p>
              </li>
            ))}
            {recentContent.length === 0 && (
              <li className="text-xs text-muted-foreground">No content yet</li>
            )}
          </ul>
          <div className="flex flex-col gap-2">
            <Link href="/admin/maia/library">
              <Button variant="outline" size="sm" className="w-full">
                View All Content
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={exportCsv}>
              Export to CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
