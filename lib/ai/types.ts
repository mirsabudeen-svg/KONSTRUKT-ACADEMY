export type MemoryType =
  | "struggled_concept"
  | "mastered_concept"
  | "learning_style"
  | "common_mistake"
  | "hint_used";

export type AlertType =
  | "inactive_3days"
  | "inactive_7days"
  | "inactive_14days"
  | "multiple_rejections"
  | "low_score"
  | "at_risk";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type CodeReviewIssue = {
  line: number;
  severity: "error" | "warning" | "info";
  message: string;
  fix: string;
};

export type HardwareViolation = {
  type: "brownout" | "power" | "pin_conflict";
  description: string;
  fix: string;
};

export type CodeReviewResult = {
  score: number;
  passed: boolean;
  issues: CodeReviewIssue[];
  hardware_violations: HardwareViolation[];
  suggestions: string[];
  positive_feedback: string;
  summary: string;
};

export type RiskLevel = "on_track" | "at_risk" | "critical";

export type StudentRiskAssessment = {
  risk_level: RiskLevel;
  risk_factors: string[];
  recommendations: string[];
  suggested_actions: string[];
};

export type LearningAlertRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl: string | null;
  trainerId: string | null;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  moduleId: number | null;
  moduleTitle: string | null;
  resolved: boolean;
  createdAt: string;
  daysSinceLogin: number | null;
  currentModuleId: number | null;
  currentModuleTitle: string | null;
};

export type CodeReviewSummary = {
  aiScore: number | null;
  passed: boolean;
  hardwareViolationCount: number;
  issueCount: number;
  suggestions: string[];
  summary: string | null;
  positiveFeedback: string | null;
};
