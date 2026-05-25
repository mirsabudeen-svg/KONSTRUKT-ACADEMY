"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/safety/report-button";
import { Textarea } from "@/components/ui/textarea";
import type { TutorMessage } from "@/lib/tutor/types";
import { cn } from "@/lib/utils";

type TutorChatWidgetProps = {
  moduleId: number;
  studentId: string;
  moduleTitle: string;
  initialConversationId?: string;
};

type LocalMessage = TutorMessage & { streaming?: boolean };

function estimateTokens(messages: LocalMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.ceil(chars / 4);
}

export default function TutorChatWidget({
  moduleId,
  studentId: _studentId, // reserved for future per-student features
  moduleTitle,
  initialConversationId,
}: TutorChatWidgetProps) {
  void _studentId;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const tokenEstimate = useMemo(() => estimateTokens(messages), [messages]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tutor/conversation?module_id=${moduleId}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setConversationId(data.conversation_id ?? null);
      setMessages(
        (data.messages ?? []).map((m: TutorMessage) => ({
          ...m,
          id: m.id ?? crypto.randomUUID(),
        }))
      );
    } catch {
      /* ignore load errors */
    } finally {
      setLoaded(true);
    }
  }, [moduleId]);

  useEffect(() => {
    if (open && !loaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadHistory();
    }
  }, [open, loaded, loadHistory]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognitionCtor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setInput((prev) => (prev ? `${prev} ${final}` : final).trim());
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onend = () => {
      setRecording(false);
      setInterimTranscript("");
    };

    recognition.onerror = () => {
      setRecording(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition || busy) return;

    if (recording) {
      recognition.stop();
      setRecording(false);
      return;
    }

    setInterimTranscript("");
    setRecording(true);
    recognition.start();
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  const handleClose = () => {
    setOpen(false);
    setExpanded(false);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleClear = async () => {
    if (!conversationId || busy) return;
    if (!window.confirm("Clear this tutor chat history?")) return;

    try {
      const res = await fetch(
        `/api/tutor/conversation?conversation_id=${conversationId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not clear history");
        return;
      }
      setMessages([]);
      setConversationId(null);
      setError(null);
    } catch {
      setError("Could not clear history");
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setError(null);
    setBusy(true);
    setInput("");

    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: LocalMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: moduleId,
          message: text,
          conversation_id: conversationId ?? undefined,
        }),
      });

      const newConvId = res.headers.get("X-Conversation-Id");
      if (newConvId) setConversationId(newConvId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Tutor unavailable");
      }

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: full } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: full, streaming: false } : m
        )
      );

      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full border border-violet-500/40 bg-gradient-to-br from-violet-600 to-cyan-600 text-2xl shadow-lg shadow-violet-500/25"
            aria-label="Open KONSTRUKT Tutor"
          >
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🤖
            </motion.span>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-slate-950">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950/95 shadow-2xl shadow-violet-900/30 backdrop-blur-md",
              expanded
                ? "inset-4 md:inset-8"
                : "inset-0 h-full w-full rounded-none md:inset-auto md:bottom-6 md:right-6 md:h-[min(560px,calc(100vh-3rem))] md:w-[min(400px,calc(100vw-2rem))] md:rounded-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-violet-500/20 bg-gradient-to-r from-violet-950/80 to-cyan-950/40 px-4 py-3">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-violet-100">
                  KONSTRUKT Tutor
                </p>
                <p className="truncate text-xs text-cyan-400/80">
                  {moduleTitle}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpanded((e) => !e)}
                  aria-label={expanded ? "Minimize" : "Expand"}
                >
                  {expanded ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClose}
                  aria-label="Close tutor"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {messages.length === 0 && !busy && (
                <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center">
                  <span className="text-3xl">🤖</span>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Ask about this mission — I&apos;ll guide you with hints,
                    not full answers.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-br-md bg-cyan-600/90 text-slate-950"
                        : "rounded-bl-md border border-violet-500/20 bg-violet-950/60 text-violet-50"
                    )}
                  >
                    {msg.streaming && !msg.content ? (
                      <TypingDots />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.role === "assistant" &&
                      msg.content &&
                      !msg.streaming && (
                        <div className="absolute -right-1 -top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <ReportButton
                            messageContent={msg.content}
                            moduleId={moduleId}
                            conversationId={conversationId}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="flex size-6 items-center justify-center rounded-full border border-violet-500/30 bg-zinc-900"
                            aria-label="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3 text-violet-300" />
                            )}
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="px-4 pb-2 text-xs text-red-400" role="alert">
                {error}
              </p>
            )}

            {/* Input */}
            <div className="border-t border-violet-500/20 bg-black/40 p-3">
              {!speechSupported && (
                <p className="mb-2 text-[10px] text-muted-foreground">
                  Voice input is not supported in this browser.
                </p>
              )}
              {recording && (
                <div className="mb-2 flex items-center gap-2 text-xs text-red-400">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                  </span>
                  Recording…
                  {interimTranscript && (
                    <span className="truncate text-violet-200">
                      {interimTranscript}
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={recording && interimTranscript ? `${input}${input ? " " : ""}${interimTranscript}` : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about this mission…"
                  disabled={busy}
                  rows={2}
                  className="min-h-[60px] flex-1 resize-none border-violet-500/20 bg-zinc-900/60 text-sm"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={busy || !speechSupported}
                    onClick={toggleRecording}
                    title="Click to speak"
                    aria-label={recording ? "Stop recording" : "Start voice input"}
                    className={cn(
                      recording
                        ? "border-red-500/50 bg-red-500/20 text-red-400"
                        : "border-violet-500/30 text-muted-foreground"
                    )}
                  >
                    {recording ? (
                      <MicOff className="size-4" aria-hidden />
                    ) : (
                      <Mic className="size-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    disabled={busy || !input.trim()}
                    onClick={() => void handleSend()}
                    className="bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy || !conversationId || messages.length === 0}
                    onClick={() => void handleClear()}
                    aria-label="Clear history"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Powered by OpenAI</span>
                <span className="font-mono">~{tokenEstimate} tokens</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Tutor typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-violet-300"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.9,
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}
