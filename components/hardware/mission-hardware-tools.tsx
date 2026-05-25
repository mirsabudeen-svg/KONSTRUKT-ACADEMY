"use client";

import { useState } from "react";
import { Bot, Box, Code2 } from "lucide-react";

import { AssemblyGuideWidget } from "@/components/hardware/assembly-guide-widget";
import { CodeSimulatorWidget } from "@/components/hardware/code-simulator-widget";
import { PromptBuilder } from "@/components/hardware/prompt-builder";
import { Button } from "@/components/ui/button";
import type { MissionLayer } from "@/lib/db/types";
import {
  getMissionHardwareType,
  isBuildMission,
  isCodeMission,
  isDesignMission,
} from "@/lib/hardware/mission-types";
import { cn } from "@/lib/utils";

type MissionHardwareToolsProps = {
  moduleId: number;
  missionLayer: MissionLayer | null;
  disabled?: boolean;
  onCodeForSubmit?: (code: string) => void;
};

type Tab = "simulator" | "prompt" | null;

export function MissionHardwareTools({
  moduleId,
  missionLayer,
  disabled = false,
  onCodeForSubmit,
}: MissionHardwareToolsProps) {
  const hardwareType = getMissionHardwareType(moduleId, missionLayer);
  const showSimulator = isCodeMission(moduleId);
  const showPrompt = isDesignMission(moduleId);
  const showAssembly = isBuildMission(moduleId, missionLayer);

  const [activeTab, setActiveTab] = useState<Tab>(
    showSimulator ? "simulator" : showPrompt ? "prompt" : null
  );

  if (hardwareType === "general" && !showAssembly) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Code2 className="size-5 text-cyan-400" aria-hidden />
        <h2 className="font-display text-xl font-semibold text-cyan-200">
          Hardware Intelligence
        </h2>
      </div>

      {(showSimulator || showPrompt) && (
        <div className="flex gap-2">
          {showSimulator && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "simulator" ? "default" : "outline"}
              className={cn(
                "gap-2",
                activeTab === "simulator" && "bg-cyan-500 text-slate-950"
              )}
              onClick={() => setActiveTab("simulator")}
            >
              <Bot className="size-4" />
              Code Simulator
            </Button>
          )}
          {showPrompt && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "prompt" ? "default" : "outline"}
              className={cn(
                "gap-2",
                activeTab === "prompt" && "bg-violet-600 text-white"
              )}
              onClick={() => setActiveTab("prompt")}
            >
              <Box className="size-4" />
              3D Prompt Builder
            </Button>
          )}
        </div>
      )}

      {activeTab === "simulator" && showSimulator && (
        <CodeSimulatorWidget
          moduleId={moduleId}
          disabled={disabled}
          onSubmitCode={onCodeForSubmit}
        />
      )}

      {activeTab === "prompt" && showPrompt && (
        <PromptBuilder moduleId={moduleId} />
      )}

      {showAssembly && <AssemblyGuideWidget moduleId={moduleId} />}
    </section>
  );
}
