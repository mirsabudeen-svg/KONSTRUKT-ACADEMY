"use client";

import type { UIMessage } from "ai";

import { cn } from "@/lib/utils";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
          isUser
            ? "bg-cyan-500/20 text-cyan-300"
            : "bg-violet-500/20 text-violet-300"
        )}
        aria-hidden
      >
        {isUser ? "YOU" : "AI"}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-xl border px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "border-cyan-500/25 bg-cyan-500/10 text-foreground"
            : "border-violet-500/20 bg-black/30 text-foreground/95"
        )}
      >
        {message.parts.map((part, i) =>
          part.type === "text" ? (
            <MessageText key={i} text={part.text} isAssistant={!isUser} />
          ) : null
        )}
      </div>
    </div>
  );
}

function MessageText({
  text,
  isAssistant,
}: {
  text: string;
  isAssistant: boolean;
}) {
  if (!isAssistant) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {segments.map((segment, i) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const inner = segment.slice(3, -3);
          const firstLineBreak = inner.indexOf("\n");
          const code =
            firstLineBreak >= 0 ? inner.slice(firstLineBreak + 1) : inner;
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-cyan-500/20 bg-black/50 p-3 font-mono text-xs text-cyan-100/90"
            >
              <code>{code.trimEnd()}</code>
            </pre>
          );
        }
        if (!segment.trim()) return null;
        return (
          <p key={i} className="whitespace-pre-wrap">
            {segment}
          </p>
        );
      })}
    </div>
  );
}
