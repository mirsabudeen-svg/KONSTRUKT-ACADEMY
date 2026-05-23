export type UserRole = "student" | "trainer" | "admin";

export type ProgressStatus = "locked" | "in_progress" | "completed";

export type DbUser = {
  id: string;
  role: UserRole;
  tokens_remaining: number;
  created_at: string;
};

export type DbModule = {
  id: number;
  title: string;
  description: string | null;
  badge_name: string;
  sort_order: number;
};

export type DbProgress = {
  student_id: string;
  module_id: number;
  status: ProgressStatus;
  score: number;
  updated_at: string;
};

/** Effective status after strict unlock rules (module 1 always reachable). */
export type ModuleDisplayStatus = ProgressStatus | "available";

export type MissionModule = DbModule & {
  progress: DbProgress | null;
  /** Whether the student may open this mission */
  unlocked: boolean;
  /** UI status after unlock logic */
  displayStatus: ModuleDisplayStatus;
};
