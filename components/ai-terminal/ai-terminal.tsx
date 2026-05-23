"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  AlertTriangle,
  Loader2,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";

import { ChatMessage } from "@/components/ai-terminal/chat-message";
import { PromptAssistant } from "@/components/ai-terminal/prompt-assistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AiTerminalProps = {
  initialTokens: number;
  supabaseConfigured: boolean;
};

export function AiTerminal({
  initialTokens,
  supabaseConfigured,
}: AiTerminalProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [input, setInput] = useState("");
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const onTokensUpdate = useCallback((remaining: number) => {
    setTokens(remaining);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const response = await fetch(url, init);

          if (!response.ok) {
            if (response.status === 402 || response.status === 503) {
              try {
                const data = await response.clone().json();
                if (data.error === "INSUFFICIENT_TOKENS") {
                  setTokens(data.tokensRemaining ?? 0);
                }
              } catch {
                /* ignore */
              }
            }
            return response;
          }

          const remaining = response.headers.get("X-Tokens-Remaining");
          if (remaining !== null) {
            const parsed = Number.parseInt(remaining, 10);
            if (!Number.isNaN(parsed)) onTokensUpdate(parsed);
          }

          return response;
        },
      }),
    [onTokensUpdate]
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
    onError: (err) => {
      if (err.message.includes("402") || err.message.includes("INSUFFICIENT")) {
        setTokens(0);
      }
    },
  });

  const depleted = tokens <= 0;
  const busy = status === "submitted" || status === "streaming";
  const canSend =
    !depleted && !busy && input.trim().length > 0 && supabaseConfigured;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!canSend) return;
    sendMessage({ text });
    setInput("");
  };

  const handleApplyPrompt = (prompt: string) => {
    if (depleted) return;
    setInput(prompt);
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4 lg:grid lg:grid-cols-5 lg:gap-6">
      {/* Chat panel */}
      <div className="flex min-h-[480px] flex-col lg:col-span-3 lg:min-h-0">
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-cyan-500/20 bg-black/40 shadow-[inset_0_0_60px_-20px_rgba(34,211,238,0.15)]">
          {/* Terminal header */}
          <div className="flex items-center justify-between border-b border-cyan-500/15 px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-cyan-400" aria-hidden />
              <span className="font-mono text-xs uppercase tracking-widest text-cyan-400/90">
                KONSTRUKT / AI Terminal
              </span>
            </div>
            <TokenPill tokens={tokens} />
          </div>

          {depleted && (
            <DepletedBanner />
          )}

          {!supabaseConfigured && (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
              Supabase required for live token tracking and generation billing.
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !depleted && (
              <EmptyState />
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-cyan-400/80">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Kontraktor AI is thinking…
              </div>
            )}
            {error && !depleted && (
              <p className="text-sm text-red-400" role="alert">
                {error.message || "Transmission failed. Try again."}
              </p>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-cyan-500/15 bg-black/50 p-4"
          >
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  depleted
                    ? "Tokens depleted — request refill from Trainer"
                    : "Ask for arm code, prompt help, or robotics guidance…"
                }
                disabled={depleted || busy || !supabaseConfigured}
                rows={2}
                className="min-h-[72px] flex-1 resize-none border-cyan-500/20 bg-black/40 font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                {busy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={stop}
                    aria-label="Stop generation"
                  >
                    <span className="size-2.5 rounded-sm bg-red-400" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!canSend}
                    className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              1 AI token per generation · Enter to send · Shift+Enter for newline
            </p>
          </form>
        </div>
      </div>

      {/* Prompt assistant */}
      <div className="lg:col-span-2 lg:min-h-0">
        <PromptAssistant
          onApplyPrompt={handleApplyPrompt}
          disabled={depleted || !supabaseConfigured}
        />
      </div>
    </div>
  );
}

function TokenPill({ tokens }: { tokens: number }) {
  const depleted = tokens <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]",
        depleted
          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {tokens} tokens
    </span>
  );
}

function DepletedBanner() {
  return (
    <div
      className="flex items-start gap-3 border-b border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent px-4 py-4"
      role="alert"
    >
      <AlertTriangle className="size-6 shrink-0 text-amber-400" aria-hidden />
      <div>
        <p className="font-display text-base font-bold text-amber-300">
          Tokens Depleted: Request Refill from Trainer
        </p>
        <p className="mt-1 text-sm text-amber-200/80">
          You&apos;ve used all AI tokens. Visit your Trainer at the academy
          station to get a refill before generating more code or prompts.
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
      <Terminal className="size-10 text-cyan-500/40" aria-hidden />
      <p className="font-display mt-4 text-lg text-muted-foreground">
        Kontraktor AI online
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Ask for ESP32 arm code (sequential motion enforced), prompt coaching, or
        mission help. Use the Prompt Assistant to build WHAT + STYLE + DETAILS.
      </p>
    </div>
  );
}
