"use client";

import { useState } from "react";
import { Box, Loader2, Sparkles, Wand2 } from "lucide-react";

import { DesignValidatorWidget } from "@/components/hardware/design-validator-widget";
import {
  TokenPredictor,
  useTokenBalance,
} from "@/components/hardware/token-predictor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DesignValidationResult } from "@/lib/hardware/types";
import { cn } from "@/lib/utils";

const WHAT_PRESETS = [
  "Robotic gripper jaw",
  "Custom bracket",
  "Joint housing",
  "Servo mount",
];

const STYLE_PRESETS = ["Mechanical", "Minimalist", "Industrial", "Organic"];

type PromptBuilderProps = {
  moduleId: number;
  onModelReady?: (url: string | null, jobId: string) => void;
};

export function PromptBuilder({ moduleId, onModelReady }: PromptBuilderProps) {
  const [step, setStep] = useState(1);
  const [what, setWhat] = useState("");
  const [style, setStyle] = useState("");
  const [details, setDetails] = useState({
    width: "",
    height: "",
    depth: "",
    holes: "yes",
    thickness: "",
    features: "",
  });
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [validation, setValidation] = useState<DesignValidationResult | null>(
    null
  );
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance = useTokenBalance();

  const detailsText = [
    details.width && details.height && details.depth
      ? `${details.width}mm × ${details.height}mm × ${details.depth}mm`
      : "",
    details.holes === "yes" ? "mounting holes" : "no holes",
    details.thickness ? `${details.thickness}mm wall thickness` : "",
    details.features,
  ]
    .filter(Boolean)
    .join(", ");

  const buildPrompt = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hardware/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          what,
          style,
          details: detailsText,
          module_id: moduleId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prompt generation failed");
      setGeneratedPrompt(data.prompt);
      setWarnings(data.warnings ?? []);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const generate3D = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/hardware/generate-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatedPrompt,
          module_id: moduleId,
          what,
          style,
          details: detailsText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "3D generation failed");

      setJobId(data.job_id);
      setResultUrl(data.preview_url);
      setValidation(data.validation ?? null);
      onModelReady?.(data.preview_url, data.job_id);

      if (data.preview_url) {
        const valRes = await fetch("/api/hardware/validate-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_url: data.preview_url,
            module_id: moduleId,
          }),
        });
        const valData = await valRes.json();
        if (valRes.ok) setValidation(valData.validation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setShowTokenModal(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/20 bg-card/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-violet-500/10 px-5 py-4">
        <Wand2 className="size-5 text-violet-400" />
        <h2 className="font-display text-lg font-semibold text-violet-200">
          Smart 3D Prompt Builder
        </h2>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          Step {step}/5
        </span>
      </div>

      <div className="space-y-5 p-5">
        {step === 1 && (
          <div>
            <p className="text-sm font-medium text-cyan-300">
              What do you want to create?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {WHAT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={what === preset ? "default" : "outline"}
                  className={what === preset ? "bg-cyan-500 text-slate-950" : ""}
                  onClick={() => setWhat(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Textarea
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Or describe your part…"
              className="mt-3 border-violet-500/20 bg-black/30 text-sm"
              rows={2}
            />
            <Button
              type="button"
              className="mt-4 bg-violet-600 hover:bg-violet-500"
              disabled={!what.trim()}
              onClick={() => setStep(2)}
            >
              Next →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm font-medium text-cyan-300">
              What style/material should it look like?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STYLE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={style === preset ? "default" : "outline"}
                  className={
                    style === preset ? "bg-cyan-500 text-slate-950" : ""
                  }
                  onClick={() => setStyle(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Textarea
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Or custom style…"
              className="mt-3 border-violet-500/20 bg-black/30 text-sm"
              rows={2}
            />
            <div className="mt-4 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-500"
                disabled={!style.trim()}
                onClick={() => setStep(3)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-cyan-300">
              Any specific details or constraints?
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["width", "height", "depth"] as const).map((dim) => (
                <label key={dim} className="text-xs text-muted-foreground">
                  {dim.charAt(0).toUpperCase() + dim.slice(1)} (mm)
                  <input
                    type="number"
                    value={details[dim]}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, [dim]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                Holes:
                <select
                  value={details.holes}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, holes: e.target.value }))
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="text-sm">
                Thickness (mm):
                <input
                  type="number"
                  value={details.thickness}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, thickness: e.target.value }))
                  }
                  className="ml-2 w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
                />
              </label>
            </div>
            <Textarea
              value={details.features}
              onChange={(e) =>
                setDetails((d) => ({ ...d, features: e.target.value }))
              }
              placeholder="Special features (symmetric design, cable routing, etc.)"
              className="border-violet-500/20 bg-black/30 text-sm"
              rows={2}
            />
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button
                type="button"
                className="gap-2 bg-violet-600 hover:bg-violet-500"
                disabled={loading}
                onClick={() => void buildPrompt()}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Build Prompt
              </Button>
            </div>
          </div>
        )}

        {step >= 4 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI-Optimized Prompt
              </p>
              <pre className="mt-2 rounded-lg border border-cyan-500/20 bg-black/30 p-4 font-mono text-xs leading-relaxed text-cyan-100">
                {generatedPrompt}
              </pre>
            </div>

            {warnings.length > 0 && (
              <ul className="text-xs text-amber-300">
                {warnings.map((w, i) => (
                  <li key={i}>⚠️ {w}</li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm">
              <p>
                This will use{" "}
                <span className="font-semibold text-cyan-300">1 token</span>
                {balance != null && (
                  <>
                    {" "}
                    ({balance} remaining → {Math.max(0, balance - 1)} after)
                  </>
                )}
              </p>
            </div>

            <Button
              type="button"
              className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              disabled={generating}
              onClick={() => setShowTokenModal(true)}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Box className="size-4" />
              )}
              Generate 3D Model
            </Button>

            {jobId && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                <p className="font-medium text-emerald-300">
                  Meshy job started: {jobId}
                </p>
                {resultUrl && (
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-cyan-400 hover:underline"
                  >
                    View preview
                  </a>
                )}
              </div>
            )}

            {validation && <DesignValidatorWidget validation={validation} />}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <TokenPredictor
        open={showTokenModal}
        cost={1}
        actionLabel="3D model generation"
        loading={generating}
        onProceed={() => void generate3D()}
        onCancel={() => setShowTokenModal(false)}
      />
    </div>
  );
}
