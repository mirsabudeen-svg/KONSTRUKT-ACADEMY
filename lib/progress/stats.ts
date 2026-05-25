import type { LucideIcon } from "lucide-react";
import {
  Box,
  Cpu,
  Hand,
  Move,
  Radio,
  Settings,
  Star,
  Terminal,
  Trophy,
  Zap,
} from "lucide-react";

import type { MissionLayer, MissionModule } from "@/lib/db/types";

export const MODULE_COUNT = 10;
export const MAX_TOTAL_SCORE = MODULE_COUNT * 100;

export const MISSION_LAYERS: MissionLayer[] = [
  "THINK",
  "DESIGN",
  "BUILD",
  "OPERATE",
];

export const MODULE_BADGE_ICONS: Record<number, LucideIcon> = {
  1: Zap,
  2: Cpu,
  3: Settings,
  4: Move,
  5: Hand,
  6: Radio,
  7: Terminal,
  8: Box,
  9: Trophy,
  10: Star,
};

export function getModuleBadgeIcon(moduleId: number): LucideIcon {
  return MODULE_BADGE_ICONS[moduleId] ?? Star;
}

export function getRank(completedCount: number): string {
  if (completedCount >= 10) return "Certified Kontraktor";
  if (completedCount >= 9) return "Senior Technician";
  if (completedCount >= 7) return "Systems Integrator";
  if (completedCount >= 5) return "Design Engineer";
  if (completedCount >= 3) return "Circuit Cadet";
  return "Rookie Builder";
}

export function getTotalScore(missions: MissionModule[]): number {
  return missions.reduce((sum, m) => sum + (m.progress?.score ?? 0), 0);
}

export function getCompletedCount(missions: MissionModule[]): number {
  return missions.filter((m) => m.displayStatus === "completed").length;
}

export function getNextBadge(missions: MissionModule[]): MissionModule | null {
  return (
    missions.find(
      (m) =>
        m.unlocked &&
        m.displayStatus !== "completed" &&
        m.displayStatus !== "locked"
    ) ??
    missions.find((m) => m.displayStatus === "locked") ??
    null
  );
}

/** Consecutive calendar days (ending today) with any progress activity. */
export function getActivityStreak(
  missions: MissionModule[],
  now = new Date()
): number {
  const activeDays = new Set<string>();
  for (const m of missions) {
    if (!m.progress?.updated_at) continue;
    const d = new Date(m.progress.updated_at);
    activeDays.add(d.toISOString().slice(0, 10));
  }
  if (activeDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeDays.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function groupMissionsByLayer(
  missions: MissionModule[]
): Record<MissionLayer, MissionModule[]> {
  const groups: Record<MissionLayer, MissionModule[]> = {
    THINK: [],
    DESIGN: [],
    BUILD: [],
    OPERATE: [],
  };

  for (const mission of missions) {
    const layer = mission.mission_layer ?? inferLayerFromId(mission.id);
    groups[layer].push(mission);
  }

  return groups;
}

function inferLayerFromId(id: number): MissionLayer {
  if (id <= 2) return "THINK";
  if (id <= 5) return "DESIGN";
  if (id <= 8) return "BUILD";
  return "OPERATE";
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}
