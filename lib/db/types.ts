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

export type NotificationType =
  | "approved"
  | "rejected"
  | "unlocked"
  | "level_up"
  | "streak_bonus"
  | "proactive_hint"
  | "trainer_message"
  | "learning_alert";

export type DbNotification = {
  id: string;
  student_id: string;
  type: NotificationType;
  title: string;
  message: string;
  module_id: number | null;
  read: boolean;
  created_at: string;
};

export type DbSubmission = {
  id: string;
  student_id: string;
  module_id: number;
  submission_type: SubmissionType;
  content_url: string | null;
  status: SubmissionStatus;
  feedback: string | null;
  trainer_feedback: string | null;
  score: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  ai_warning?: boolean;
  trainer_notes?: string | null;
  ai_pre_score?: number | null;
};

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
  total_xp?: number;
  level?: string;
  current_streak?: number;
  longest_streak?: number;
  last_login_date?: string | null;
  created_at: string;
};

export type MissionLayer = "THINK" | "DESIGN" | "BUILD" | "OPERATE";

export type DbModule = {
  id: number;
  title: string;
  description: string | null;
  mission_layer: MissionLayer | null;
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
