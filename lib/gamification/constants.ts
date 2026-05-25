export const XP_REWARDS = {
  module_completed: 100,
  high_score_bonus: 50,
  first_attempt_approval: 25,
  daily_login: 10,
  streak_7_days: 75,
  streak_30_days: 200,
  challenge_completed: 50,
  daily_briefing: 10,
} as const;

export type XPEventType = keyof typeof XP_REWARDS;

export const LEVELS = [
  { name: "Rookie Builder", min: 0, max: 99 },
  { name: "Circuit Cadet", min: 100, max: 249 },
  { name: "Design Engineer", min: 250, max: 499 },
  { name: "Systems Integrator", min: 500, max: 799 },
  { name: "Senior Technician", min: 800, max: 1099 },
  { name: "Certified Kontraktor", min: 1100, max: 99999 },
] as const;

export type LevelName = (typeof LEVELS)[number]["name"];

export function calculateLevel(totalXp: number): LevelName {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].min) {
      return LEVELS[i].name;
    }
  }
  return LEVELS[0].name;
}

export function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    "Rookie Builder": "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
    "Circuit Cadet": "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    "Design Engineer": "text-blue-400 border-blue-500/30 bg-blue-500/10",
    "Systems Integrator": "text-violet-400 border-violet-500/30 bg-violet-500/10",
    "Senior Technician": "text-orange-400 border-orange-500/30 bg-orange-500/10",
    "Certified Kontraktor": "text-amber-400 border-amber-500/30 bg-amber-500/10",
  };
  return colors[level] ?? colors["Rookie Builder"];
}

export function formatEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    module_completed: "Module Completed",
    high_score_bonus: "Excellence Bonus",
    first_attempt_approval: "First Attempt",
    daily_login: "Daily Login",
    streak_7_days: "7-Day Streak",
    streak_30_days: "30-Day Streak",
    challenge_completed: "Challenge Completed",
    daily_briefing: "Daily Briefing",
  };
  return labels[eventType] ?? eventType.replace(/_/g, " ");
}

export function getLevelBounds(levelName: string) {
  const idx = LEVELS.findIndex((l) => l.name === levelName);
  if (idx === -1) return { min: 0, max: 99, nextMin: 100 as number | null };
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1];
  return {
    min: current.min,
    max: current.max,
    nextMin: next?.min ?? null,
  };
}
