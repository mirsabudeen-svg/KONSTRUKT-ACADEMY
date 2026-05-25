"use client";

import { useState } from "react";

import { MissionHardwareTools } from "@/components/hardware/mission-hardware-tools";
import { MissionSubmitForm } from "@/components/missions/mission-submit-form";
import type { MissionLayer } from "@/lib/db/types";
import { isDesignMission } from "@/lib/hardware/mission-types";

type MissionDetailClientProps = {
  moduleId: number;
  missionLayer: MissionLayer | null;
  canSubmit: boolean;
  showHardwareTools: boolean;
};

export function MissionDetailClient({
  moduleId,
  missionLayer,
  canSubmit,
  showHardwareTools,
}: MissionDetailClientProps) {
  const [codeFromSimulator, setCodeFromSimulator] = useState<string | undefined>();

  return (
    <div className="space-y-8">
      {showHardwareTools && (
        <MissionHardwareTools
          moduleId={moduleId}
          missionLayer={missionLayer}
          disabled={!canSubmit}
          onCodeForSubmit={(code) => setCodeFromSimulator(code)}
        />
      )}

      <MissionSubmitForm
        moduleId={moduleId}
        disabled={!canSubmit}
        showDesignValidation={isDesignMission(moduleId)}
        externalCode={codeFromSimulator}
      />
    </div>
  );
}
