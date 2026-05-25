"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  Copy,
  Loader2,
  Send,
  Wrench,
} from "lucide-react";

import { MarkdownMessage } from "@/components/admin/markdown-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AriaContextType } from "@/lib/aria/types";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const QUICK_COMMANDS: {
  label: string;
  prompt: string;
  contextType?: AriaContextType;
  taskType?: string;
}[] = [
  {
    label: "System Health",
    prompt:
      "Run a complete system health check and give me a full status report",
    contextType: "system_health",
  },
  {
    label: "Fix Errors",
    prompt:
      "Analyze recent errors and tell me what needs to be fixed immediately",
    contextType: "error_diagnosis",
  },
  {
    label: "Maintenance",
    prompt:
      "What maintenance tasks are due and what should I prioritize?",
    contextType: "maintenance",
  },
  {
    label: "Token Audit",
    prompt:
      "Audit token balances — who needs refills and who is abusing tokens?",
    taskType: "token_audit",
  },
  {
    label: "User Sync",
    prompt:
      "Check if all Clerk users are synced to Supabase. Report any mismatches.",
    taskType: "user_sync",
  },
  {
    label: "DB Cleanup",
    prompt:
      "Identify database cleanup opportunities — orphaned records, large tables, old logs",
    taskType: "database_cleanup",
  },
];

type HealthSummary = {
  context?: {
    platform_stats: {
      pending_submissions: number;
      open_safety_flags: number;
      low_token_students: number;
    };
    api_health: Record<string, string>;
    recent_alerts: { id: string; message: string }[];
  };
};

function statusDot(status: string) {
  if (status === "healthy") return "bg-emerald-400";
  if (status === "degraded") return "bg-amber-400";
  if (status === "down") return "bg-red-500";
  return "bg-zinc-500";
}

export function AriaChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "How can I help you manage the platform today, Admin? I can diagnose errors, monitor system health, run maintenance tasks, and explain any system behavior.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/aria/health");
      if (res.ok) setHealth(await res.json());
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
    const interval = setInterval(() => void loadHealth(), 60_000);
    return () => clearInterval(interval);
  }, [loadHealth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(
    text: string,
    contextType?: AriaContextType,
    taskType?: string
  ) {
    if (!text.trim() || busy) return;

    if (taskType) {
      await fetch("/api/admin/aria/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type: taskType }),
      });
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
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
      const res = await fetch("/api/admin/aria/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationId,
          context_type: contextType,
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

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
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
          msg.id === assistantId ? { ...msg, content: full, streaming: false } : msg
        )
      );
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
      void loadHealth();
    }
  }

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveAsMaintenance(content: string) {
    await fetch("/api/admin/aria/maintenance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "ARIA suggested maintenance",
        description: content.slice(0, 2000),
        task_type: "general",
      }),
    });
  }

  const apiHealth = health?.context?.api_health ?? {};
  const stats = health?.context?.platform_stats;
  const allHealthy = Object.values(apiHealth).every(
    (s) => s === "healthy" || s === "unknown"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            🤖 ARIA — Admin Intelligence Assistant
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={cn(
                "size-2 rounded-full",
                allHealthy ? "bg-emerald-400" : "bg-amber-400"
              )}
            />
            System Status:{" "}
            {allHealthy ? "All systems operational" : "Issues detected — see panel"}
          </p>
        </div>
        <Link href="/admin/aria/health">
          <Button variant="outline" size="sm" className="gap-2 border-orange-500/30">
            <Activity className="size-4" />
            System Health Dashboard
          </Button>
        </Link>
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
                  {msg.role === "user" ? "Admin" : "ARIA"}
                </div>
                {msg.streaming && !msg.content ? (
                  <Loader2 className="size-5 animate-spin text-orange-400" />
                ) : (
                  <MarkdownMessage content={msg.content} />
                )}
                {msg.role === "assistant" && !msg.streaming && msg.content && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => void copyMessage(msg.id, msg.content)}
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
                      onClick={() => void saveAsMaintenance(msg.content)}
                    >
                      <Wrench className="size-3" />
                      Save as task
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-orange-500/10 p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_COMMANDS.map((cmd) => (
                <Button
                  key={cmd.label}
                  variant="outline"
                  size="xs"
                  className="border-orange-500/20 text-orange-200"
                  disabled={busy}
                  onClick={() =>
                    void sendMessage(cmd.prompt, cmd.contextType, cmd.taskType)
                  }
                >
                  {cmd.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
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
                className="shrink-0"
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

        <div className="space-y-4 rounded-xl border border-orange-500/15 bg-sidebar/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-orange-300">
              System Panel
            </h2>
            <Button
              variant="ghost"
              size="xs"
              disabled={healthLoading}
              onClick={() => void loadHealth()}
            >
              {healthLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              API Health
            </p>
            <div className="space-y-1.5">
              {["supabase", "openai", "clerk", "meshy", "whatsapp"].map((svc) => (
                <div key={svc} className="flex items-center gap-2 text-sm capitalize">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      statusDot(apiHealth[svc] ?? "unknown")
                    )}
                  />
                  {svc}:{" "}
                  <span className="text-muted-foreground">
                    {apiHealth[svc] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-orange-500/5 p-2">
              <p className="text-[10px] text-muted-foreground">Alerts</p>
              <p className="font-mono text-lg text-orange-300">
                {health?.context?.recent_alerts?.length ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-orange-500/5 p-2">
              <p className="text-[10px] text-muted-foreground">Pending</p>
              <p className="font-mono text-lg text-orange-300">
                {stats?.pending_submissions ?? "—"}
              </p>
            </div>
            <div className="rounded-lg bg-orange-500/5 p-2">
              <p className="text-[10px] text-muted-foreground">Safety Flags</p>
              <p className="font-mono text-lg text-orange-300">
                {stats?.open_safety_flags ?? "—"}
              </p>
            </div>
            <div className="rounded-lg bg-orange-500/5 p-2">
              <p className="text-[10px] text-muted-foreground">Low Tokens</p>
              <p className="font-mono text-lg text-orange-300">
                {stats?.low_token_students ?? "—"}
              </p>
            </div>
          </div>

          {(health?.context?.recent_alerts ?? []).slice(0, 3).map((a) => (
            <Badge key={a.id} variant="outline" className="block truncate text-xs">
              {a.message}
            </Badge>
          ))}

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="w-full"
              disabled={healthLoading}
              onClick={async () => {
                await fetch("/api/admin/aria/health", { method: "POST" });
                void loadHealth();
              }}
            >
              Run Health Check
            </Button>
            <Link href="/admin/aria/health">
              <Button variant="outline" size="sm" className="w-full border-orange-500/30">
                View Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
