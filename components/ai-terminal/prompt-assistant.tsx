"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EXAMPLES = {
  what: "A 4-joint robot arm sequence that waves hello",
  style: "Clean Arduino code with comments for beginners",
  details:
    "ESP32-S3 + PCA9685, sequential servo motion only, 1 second delays",
};

type PromptAssistantProps = {
  onApplyPrompt: (prompt: string) => void;
  disabled?: boolean;
};

export function PromptAssistant({
  onApplyPrompt,
  disabled,
}: PromptAssistantProps) {
  const [what, setWhat] = useState("");
  const [style, setStyle] = useState("");
  const [details, setDetails] = useState("");

  const composed = useMemo(() => {
    const parts = [
      what.trim() && `WHAT: ${what.trim()}`,
      style.trim() && `STYLE: ${style.trim()}`,
      details.trim() && `DETAILS: ${details.trim()}`,
    ].filter(Boolean);
    return parts.join("\n");
  }, [what, style, details]);

  const fillExample = () => {
    setWhat(EXAMPLES.what);
    setStyle(EXAMPLES.style);
    setDetails(EXAMPLES.details);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-violet-500/20 bg-card/40 backdrop-blur-sm">
      <div className="border-b border-violet-500/15 px-5 py-4">
        <div className="flex items-center gap-2 text-violet-300">
          <Lightbulb className="size-5" aria-hidden />
          <h2 className="font-display font-semibold">Prompt Assistant</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Build stronger AI requests with{" "}
          <span className="font-mono text-violet-300">WHAT + STYLE + DETAILS</span>
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <PromptField
          label="WHAT"
          hint="The object or behavior you need"
          example="Pick-and-place routine for red cubes"
          value={what}
          onChange={setWhat}
          disabled={disabled}
          accent="cyan"
        />
        <PromptField
          label="STYLE"
          hint="Tone, aesthetic, or code approach"
          example="Beginner-friendly, heavily commented C++"
          value={style}
          onChange={setStyle}
          disabled={disabled}
          accent="violet"
        />
        <PromptField
          label="DETAILS"
          hint="Hardware limits, sizes, timing"
          example="Sequential MG996R moves, delay(1000) between joints"
          value={details}
          onChange={setDetails}
          disabled={disabled}
          accent="amber"
        />

        <div className="rounded-lg border border-cyan-500/15 bg-black/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-cyan-500/80">
            Live preview
          </p>
          <p className="mt-2 min-h-[80px] whitespace-pre-wrap font-mono text-xs text-cyan-100/90">
            {composed || "Fill in the fields above to compose your prompt…"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-violet-500/15 p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fillExample}
          disabled={disabled}
        >
          Load example
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-violet-600 text-white hover:bg-violet-500"
          disabled={disabled || !composed.trim()}
          onClick={() => onApplyPrompt(composed)}
        >
          <Wand2 className="size-3.5" aria-hidden />
          Inject to terminal
        </Button>
      </div>
    </div>
  );
}

function PromptField({
  label,
  hint,
  example,
  value,
  onChange,
  disabled,
  accent,
}: {
  label: string;
  hint: string;
  example: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  accent: "cyan" | "violet" | "amber";
}) {
  const labelColor = {
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
  }[accent];

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles className={cn("size-3.5", labelColor)} aria-hidden />
        <span className={cn("font-mono text-xs font-bold tracking-wider", labelColor)}>
          {label}
        </span>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={example}
        disabled={disabled}
        rows={2}
        className="border-white/10 bg-black/20 font-mono text-sm"
      />
    </div>
  );
}
