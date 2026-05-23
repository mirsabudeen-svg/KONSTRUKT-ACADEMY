import type {
  DbModule,
  DbProgress,
  MissionModule,
  ModuleDisplayStatus,
  ProgressStatus,
} from "@/lib/db/types";

const MODULE_COUNT = 10;

/**
 * Module N unlocks only when module N-1 is completed.
 * Module 1 is always unlocked for enrolled students.
 */
export function isModuleUnlocked(
  moduleId: number,
  progressByModuleId: Map<number, DbProgress>
): boolean {
  if (moduleId <= 1) return true;
  const previous = progressByModuleId.get(moduleId - 1);
  return previous?.status === "completed";
}

export function resolveDisplayStatus(
  unlocked: boolean,
  stored: ProgressStatus | undefined
): ModuleDisplayStatus {
  if (!unlocked) return "locked";
  if (stored === "completed") return "completed";
  if (stored === "pending_review") return "pending_review";
  if (stored === "in_progress") return "in_progress";
  if (stored === "ready") return "ready";
  return "available";
}

export function buildMissionModules(
  modules: DbModule[],
  progressRows: DbProgress[]
): MissionModule[] {
  const progressByModuleId = new Map(
    progressRows.map((p) => [p.module_id, p])
  );

  const sorted = [...modules].sort((a, b) => a.sort_order - b.sort_order);

  return sorted.map((module) => {
    const progress = progressByModuleId.get(module.id) ?? null;
    const unlocked = isModuleUnlocked(module.id, progressByModuleId);
    const displayStatus = resolveDisplayStatus(
      unlocked,
      progress?.status
    );

    return {
      ...module,
      progress,
      unlocked,
      displayStatus,
    };
  });
}

export function getMissionSummary(missions: MissionModule[]) {
  const completed = missions.filter((m) => m.displayStatus === "completed").length;
  const active =
    missions.find(
      (m) =>
        m.unlocked &&
        (m.displayStatus === "in_progress" ||
          m.displayStatus === "available" ||
          m.displayStatus === "ready" ||
          m.displayStatus === "pending_review")
    ) ?? null;

  return {
    total: MODULE_COUNT,
    completed,
    activeMission: active,
    percent: Math.round((completed / MODULE_COUNT) * 100),
  };
}

/** Fallback curriculum when Supabase is not configured (local dev). */
export function getFallbackMissions(): MissionModule[] {
  const titles = [
    "Launch Sequence",
    "Wiring Bay",
    "Servo Calibration",
    "First Movement",
    "Pick & Place",
    "Sensor Dock",
    "AI Prompt Lab",
    "3D Forge",
    "Mission Challenge",
    "Graduation Flight",
  ];

  return titles.map((title, i) => {
    const id = i + 1;
    const unlocked = id === 1;
    const displayStatus: ModuleDisplayStatus =
      id === 1 ? "in_progress" : "locked";

    return {
      id,
      title,
      description: null,
      badge_name: `Badge ${id}`,
      sort_order: id,
      progress: null,
      unlocked,
      displayStatus,
    };
  });
}
