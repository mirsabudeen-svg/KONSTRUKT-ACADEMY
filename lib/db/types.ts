export type UserRole = "student" | "trainer" | "admin";

export type ProgressStatus =
  | "locked"
  | "ready"
  | "in_progress"
  | "pending_review"
  | "completed";

export type PrintQueueStatus =
  | "waiting_for_printer"
  | "printing"
  | "failed"
  | "completed";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type SubmissionType =
  | "quiz"
  | "prompt_text"
  | "stl_file"
  | "video_demo"
  | "code"
  | "stl";

export type DbUser = {
  id: string;
  role: UserRole;
  cohort_id: string | null;
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
  score: number | null;
  updated_at: string;
};

/** Effective status after strict unlock rules (module 1 always reachable). */
export type ModuleDisplayStatus =
  | ProgressStatus
  | "available";

export type MissionModule = DbModule & {
  progress: DbProgress | null;
  unlocked: boolean;
  displayStatus: ModuleDisplayStatus;
};
