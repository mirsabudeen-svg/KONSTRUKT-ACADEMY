export type PrintJobStatus =
  | "queued"
  | "validating"
  | "printing"
  | "completed"
  | "failed"
  | "cancelled";

export type SimulationViolationType = "brownout" | "no_delay" | "over_angle";

export type SimulationStep = {
  step: number;
  servo: string;
  action: string;
  line: number;
  delay_after_ms: number;
  safe: boolean;
  kind: "servo" | "delay";
};

export type SimulationViolation = {
  type: SimulationViolationType;
  line: number;
  description: string;
  fix: string;
};

export type SimulationResult = {
  steps: SimulationStep[];
  violations: SimulationViolation[];
  total_duration_ms: number;
  safe: boolean;
  servo_count: number;
};

export type PrintEstimate = {
  estimated_minutes: number;
  material: string;
  weight_grams: number;
  difficulty: "easy" | "medium" | "hard";
  potential_issues: string[];
  recommended_settings: {
    layer_height: string;
    infill: string;
    supports: boolean;
    orientation: string;
  };
};

export type DesignValidationCheck = {
  name: string;
  passed: boolean;
  message: string;
};

export type DesignValidationResult = {
  passed: boolean;
  score: number;
  checks: DesignValidationCheck[];
  suggestions: string[];
  ready_to_print: boolean;
};

export type DesignConstraintCheck = {
  within_size_limit: boolean;
  estimated_dimensions: string;
  needs_supports: boolean;
  printability_score: number;
  issues: string[];
  suggestions: string[];
};

export type DbPrintJob = {
  id: string;
  student_id: string | null;
  submission_id: string | null;
  module_id: number | null;
  file_url: string | null;
  file_name: string | null;
  estimated_print_minutes: number | null;
  actual_print_minutes: number | null;
  material: string;
  weight_grams: number | null;
  printer: string;
  status: PrintJobStatus;
  validation_passed: boolean | null;
  validation_issues: unknown;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type AssemblyHelpResult = {
  answer: string;
  steps: string[];
  diagramDescription: string;
  diagramAscii: string;
};

export type PrintQueueRow = DbPrintJob & {
  studentName: string;
  studentEmail: string | null;
  moduleTitle: string | null;
  queuePosition: number;
};
