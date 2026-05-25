export type WhatsAppMessageType =
  | "module_completed"
  | "weekly_progress"
  | "badge_earned"
  | "alert"
  | "announcement"
  | "login_reminder"
  | "certificate"
  | "custom"
  | "test"
  | "marketing_broadcast";

export type WhatsAppMessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped";

export type ParentNotificationPrefs = {
  module_completions: boolean;
  weekly_reports: boolean;
  login_reminders: boolean;
  announcements: boolean;
};

export type ParentContact = {
  id: string;
  student_id: string;
  parent_name: string;
  whatsapp_number: string;
  email: string | null;
  relationship: "parent" | "guardian" | "sibling";
  notifications_enabled: boolean;
  portal_token: string;
  portal_token_created_at: string;
  created_at: string;
};

export type DailyBriefing = {
  id: string;
  student_id: string;
  briefing_date: string;
  content: string;
  task: string | null;
  xp_reward: number;
  completed: boolean;
  created_at: string;
};

export const DEFAULT_PARENT_NOTIFICATION_PREFS: ParentNotificationPrefs = {
  module_completions: true,
  weekly_reports: true,
  login_reminders: true,
  announcements: true,
};
