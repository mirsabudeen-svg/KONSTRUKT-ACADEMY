export type SafetySeverity = "low" | "medium" | "high" | "critical";

export type SafetyFlagType =
  | "inappropriate_content"
  | "cheating_detected"
  | "ai_generated_code"
  | "plagiarism"
  | "concerning_language"
  | "excessive_usage"
  | "student_report";

export type ContentScanAction = "allow" | "warn" | "block" | "alert_trainer";

export type ContentScanResult = {
  safe: boolean;
  severity: "safe" | SafetySeverity;
  flags: Array<{
    type: string;
    reason: string;
  }>;
  action: ContentScanAction;
  blockMessage?: string;
  safetyNote?: string;
};

export type PlagiarismCheckResult = {
  similarity_score: number;
  matched_submissions: Array<{
    submission_id: string;
    student_id: string;
    score: number;
  }>;
  ai_generated_probability: number;
  ai_indicators: string[];
  ai_verdict: "student_written" | "likely_ai" | "definitely_ai";
  flagged: boolean;
};

export type DbSafetyFlag = {
  id: string;
  student_id: string | null;
  flag_type: string;
  severity: SafetySeverity;
  source: string;
  content_snippet: string | null;
  details: Record<string, unknown>;
  reviewed: boolean;
  reviewed_by: string | null;
  resolved: boolean;
  created_at: string;
};

export type SafetySettings = {
  contentScanningEnabled: boolean;
  plagiarismDetectionEnabled: boolean;
  sessionBreakMinutes: number;
  idleDetectionMinutes: number;
  aiGenerationThreshold: number;
  similarityThreshold: number;
  autoBlockHighSeverity: boolean;
  notifyTrainerOnFlags: boolean;
};

export type SessionHealth = {
  needs_break: boolean;
  needs_hint: boolean;
  message: string | null;
};
