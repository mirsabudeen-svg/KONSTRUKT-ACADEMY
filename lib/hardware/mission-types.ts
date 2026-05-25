import type { MissionLayer } from "@/lib/db/types";

export type MissionHardwareType = "code" | "design" | "build" | "general";

const CODE_MISSIONS = new Set([4, 9]);
const DESIGN_MISSIONS = new Set([3, 5]);

export function getMissionHardwareType(
  moduleId: number,
  missionLayer?: MissionLayer | null
): MissionHardwareType {
  if (CODE_MISSIONS.has(moduleId)) return "code";
  if (DESIGN_MISSIONS.has(moduleId)) return "design";
  if (missionLayer === "BUILD" || [6, 7, 8].includes(moduleId)) return "build";
  return "general";
}

export function isCodeMission(moduleId: number): boolean {
  return CODE_MISSIONS.has(moduleId);
}

export function isDesignMission(moduleId: number): boolean {
  return DESIGN_MISSIONS.has(moduleId);
}

export function isBuildMission(
  moduleId: number,
  missionLayer?: MissionLayer | null
): boolean {
  return getMissionHardwareType(moduleId, missionLayer) === "build";
}
