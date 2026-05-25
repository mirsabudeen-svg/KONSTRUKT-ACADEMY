"use client";

import { cn } from "@/lib/utils";

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-orange-500/10 px-1 py-0.5 font-mono text-xs text-orange-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(
        <strong key={match.index} className="font-semibold text-orange-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownMessage({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = content.split(/```/);

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, i) => {
        if (i % 2 === 1) {
          const lines = block.split("\n");
          const code = lines.slice(1).join("\n").trimEnd() || lines[0];
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-orange-500/20 bg-black/40 p-3 font-mono text-xs text-orange-100"
            >
              <code>{code}</code>
            </pre>
          );
        }

        return block.split("\n").map((line, j) => {
          if (!line.trim()) return <br key={`${i}-${j}`} />;
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <p key={`${i}-${j}`} className="flex gap-2 pl-1">
                <span className="text-orange-400">•</span>
                <span>{renderInline(line.slice(2))}</span>
              </p>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            return (
              <p key={`${i}-${j}`} className="flex gap-2 pl-1">
                <span className="font-mono text-orange-400">{num}.</span>
                <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
              </p>
            );
          }
          return (
            <p key={`${i}-${j}`}>{renderInline(line)}</p>
          );
        });
      })}
    </div>
  );
}
