export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type ApiHealthMap = {
  supabase: HealthStatus;
  openai: HealthStatus;
  clerk: HealthStatus;
  meshy: HealthStatus;
  whatsapp: HealthStatus;
};

export type ApiHealthCheck = {
  service: keyof ApiHealthMap;
  status: HealthStatus;
  response_time_ms: number;
  error_message?: string;
};

export type PlatformStats = {
  total_students: number;
  active_today: number;
  pending_submissions: number;
  open_safety_flags: number;
  low_token_students: number;
  failed_print_jobs: number;
};

export type RecentError = {
  type: string;
  message: string;
  timestamp: string;
  count: number;
};

export type SystemAlert = {
  id: string;
  severity: string;
  message: string;
  created_at: string;
};

export type SystemContext = {
  platform_stats: PlatformStats;
  recent_errors: RecentError[];
  api_health: ApiHealthMap;
  database_health: {
    table_sizes: Record<string, number>;
    slow_queries: number;
    failed_rls_policies: number;
  };
  recent_alerts: SystemAlert[];
  maintenance_due: string[];
};

export type AriaMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type AriaContextType =
  | "system_health"
  | "error_diagnosis"
  | "maintenance"
  | "general"
  | "database";
