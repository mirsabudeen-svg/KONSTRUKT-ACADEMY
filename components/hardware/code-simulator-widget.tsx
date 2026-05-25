"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Play,
  Send,
} from "lucide-react";

import {
  RobotArmSvg,
  anglesFromSimulationSteps,
} from "@/components/hardware/robot-arm-svg";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SimulationResult } from "@/lib/hardware/types";
import { cn } from "@/lib/utils";

const DEFAULT_CODE = `// Sequential servo motion — KONSTRUKT Academy
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

void setup() {
  pwm.begin();
  pwm.setPWMFreq(50);
}

void loop() {
  servo1.write(90);
  delay(1000);
  servo2.write(45);
  delay(1000);
}`;

type CodeSimulatorWidgetProps = {
  moduleId: number;
  onSubmitCode?: (code: string) => void;
  disabled?: boolean;
};

export function CodeSimulatorWidget({
  moduleId,
  onSubmitCode,
  disabled = false,
}: CodeSimulatorWidgetProps) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async () => {
    setRunning(true);
    setError(null);
    setActiveStep(0);

    try {
      const res = await fetch("/api/hardware/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, module_id: moduleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Simulation failed");

      setResult(data.result as SimulationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  }, [code, moduleId]);

  useEffect(() => {
    if (!result || result.steps.length === 0) return;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= result.steps.length) {
        clearInterval(interval);
        return;
      }
      setActiveStep(step);
    }, 800);

    return () => clearInterval(interval);
  }, [result]);

  const displaySteps = result?.steps.slice(0, activeStep + 1) ?? [];
  const angles = result
    ? anglesFromSimulationSteps(displaySteps)
    : anglesFromSimulationSteps([]);
  const activeServo = result?.steps[activeStep]?.servo ?? null;

  const violationCount = result?.violations.length ?? 0;
  const brownoutCount =
    result?.violations.filter((v) => v.type === "brownout").length ?? 0;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-card/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-cyan-500/10 px-5 py-4">
        <Bot className="size-5 text-cyan-400" aria-hidden />
        <h2 className="font-display text-lg font-semibold text-cyan-200">
          Code Simulator
        </h2>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Code Input
          </p>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={disabled || running}
            rows={14}
            className="mt-2 border-cyan-500/20 bg-black/30 font-mono text-xs"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visual Preview
          </p>
          <div className="mt-2 h-[280px] overflow-hidden rounded-lg border border-cyan-500/20 bg-black/40">
            <RobotArmSvg angles={angles} activeServo={activeServo} />
          </div>
        </div>
      </div>

      <div className="border-t border-cyan-500/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Simulation Steps
        </p>

        {!result ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Run a simulation to see step-by-step servo motion and safety checks.
          </p>
        ) : (
          <ul className="mt-3 max-h-40 space-y-1.5 overflow-auto">
            {result.steps.map((step, i) => (
              <li
                key={step.step}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
                  i <= activeStep
                    ? "bg-cyan-500/10 text-cyan-100"
                    : "text-muted-foreground"
                )}
              >
                {step.kind === "delay" ? (
                  <>
                    <span className="font-mono text-xs">
                      Step {step.step}: delay({step.action.match(/\d+/)?.[0]}ms)
                    </span>
                    <CheckCircle2 className="ml-auto size-4 text-emerald-400" />
                  </>
                ) : (
                  <>
                    <span className="font-mono text-xs">
                      Step {step.step}: {step.servo} → {step.action} (L
                      {step.line})
                    </span>
                    {step.safe ? (
                      <CheckCircle2 className="ml-auto size-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="ml-auto size-4 text-amber-400" />
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {result && result.violations.length > 0 && (
          <div className="mt-4 space-y-2">
            {result.violations.map((v, i) => (
              <div
                key={i}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
              >
                <span className="font-medium text-amber-300">
                  ⚠️ {v.type} (line {v.line}):
                </span>{" "}
                {v.description}
                <p className="mt-1 text-xs text-muted-foreground">Fix: {v.fix}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              result?.safe
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300"
            )}
          >
            {result
              ? result.safe
                ? "✅ Safe to submit"
                : `⚠️ Violations: ${violationCount}${brownoutCount > 0 ? ` (${brownoutCount} brownout)` : ""}`
              : "Not simulated yet"}
          </span>
          {result && (
            <span className="font-mono text-xs text-muted-foreground">
              {result.servo_count} servo(s) · {result.total_duration_ms}ms total
            </span>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => void runSimulation()}
            disabled={disabled || running}
            className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Run Simulation
          </Button>
          {onSubmitCode && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || !result?.safe}
              className="gap-2"
              onClick={() => onSubmitCode(code)}
            >
              <Send className="size-4" />
              Submit Code
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
