import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";

import type {
  ApiHealthCheck,
  ApiHealthMap,
  HealthStatus,
  RecentError,
  SystemContext,
} from "@/lib/aria/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const MONITORED_TABLES = [
  "users",
  "progress",
  "submissions",
  "notifications",
  "session_logs",
  "system_health_logs",
  "whatsapp_messages",
  "print_jobs",
  "safety_flags",
  "token_usage_log",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function pingSupabase(): Promise<ApiHealthCheck> {
  const start = Date.now();
  try {
    if (!isSupabaseConfigured()) {
      return {
        service: "supabase",
        status: "down",
        response_time_ms: Date.now() - start,
        error_message: "Supabase not configured",
      };
    }
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("users").select("id", { count: "exact", head: true });
    if (error) throw error;
    const ms = Date.now() - start;
    return {
      service: "supabase",
      status: ms > 2000 ? "degraded" : "healthy",
      response_time_ms: ms,
    };
  } catch (err) {
    return {
      service: "supabase",
      status: "down",
      response_time_ms: Date.now() - start,
      error_message: err instanceof Error ? err.message : "Query failed",
    };
  }
}

async function pingOpenAI(): Promise<ApiHealthCheck> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      service: "openai",
      status: "down",
      response_time_ms: 0,
      error_message: "OPENAI_API_KEY not configured",
    };
  }
  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    const ms = Date.now() - start;
    return {
      service: "openai",
      status: ms > 3000 ? "degraded" : "healthy",
      response_time_ms: ms,
    };
  } catch (err) {
    return {
      service: "openai",
      status: "down",
      response_time_ms: Date.now() - start,
      error_message: err instanceof Error ? err.message : "OpenAI unreachable",
    };
  }
}

async function pingClerk(): Promise<ApiHealthCheck> {
  const start = Date.now();
  try {
    const clerk = await clerkClient();
    await clerk.users.getUserList({ limit: 1 });
    const ms = Date.now() - start;
    return {
      service: "clerk",
      status: ms > 2000 ? "degraded" : "healthy",
      response_time_ms: ms,
    };
  } catch (err) {
    return {
      service: "clerk",
      status: "down",
      response_time_ms: Date.now() - start,
      error_message: err instanceof Error ? err.message : "Clerk unreachable",
    };
  }
}

async function pingMeshy(): Promise<ApiHealthCheck> {
  const start = Date.now();
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return {
      service: "meshy",
      status: "unknown",
      response_time_ms: 0,
      error_message: "MESHY_API_KEY not configured (mock mode)",
    };
  }
  try {
    const res = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const ms = Date.now() - start;
    const status: HealthStatus =
      res.ok || res.status === 405 ? (ms > 3000 ? "degraded" : "healthy") : "degraded";
    return { service: "meshy", status, response_time_ms: ms };
  } catch (err) {
    return {
      service: "meshy",
      status: "down",
      response_time_ms: Date.now() - start,
      error_message: err instanceof Error ? err.message : "Meshy unreachable",
    };
  }
}

async function pingWhatsApp(): Promise<ApiHealthCheck> {
  const start = Date.now();
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return {
      service: "whatsapp",
      status: "unknown",
      response_time_ms: 0,
      error_message: "WhatsApp credentials not configured",
    };
  }
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ms = Date.now() - start;
    return {
      service: "whatsapp",
      status: res.ok ? (ms > 3000 ? "degraded" : "healthy") : "degraded",
      response_time_ms: ms,
      error_message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      service: "whatsapp",
      status: "down",
      response_time_ms: Date.now() - start,
      error_message: err instanceof Error ? err.message : "WhatsApp API unreachable",
    };
  }
}

export async function checkAPIHealth(options?: {
  persist?: boolean;
}): Promise<{
  checks: ApiHealthCheck[];
  summary: ApiHealthMap;
}> {
  const checks = await Promise.all([
    pingSupabase(),
    pingOpenAI(),
    pingClerk(),
    pingMeshy(),
    pingWhatsApp(),
  ]);

  const summary = checks.reduce(
    (acc, check) => {
      acc[check.service] = check.status;
      return acc;
    },
    {} as ApiHealthMap
  );

  if (options?.persist !== false && isSupabaseConfigured()) {
    const admin = createSupabaseAdmin();
    await admin.from("system_health_logs").insert(
      checks.map((c) => ({
        check_type: c.service,
        status: c.status,
        response_time_ms: c.response_time_ms,
        error_message: c.error_message ?? null,
      }))
    );
  }

  return { checks, summary };
}

async function getCachedApiHealth(): Promise<ApiHealthMap> {
  if (!isSupabaseConfigured()) {
    return {
      supabase: "down",
      openai: "unknown",
      clerk: "unknown",
      meshy: "unknown",
      whatsapp: "unknown",
    };
  }

  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("system_health_logs")
    .select("check_type, status")
    .gte("checked_at", since)
    .order("checked_at", { ascending: false });

  const summary: ApiHealthMap = {
    supabase: "unknown",
    openai: "unknown",
    clerk: "unknown",
    meshy: "unknown",
    whatsapp: "unknown",
  };

  for (const row of data ?? []) {
    const key = row.check_type as keyof ApiHealthMap;
    if (summary[key] === "unknown") {
      summary[key] = row.status as HealthStatus;
    }
  }

  const hasRecent = Object.values(summary).some((s) => s !== "unknown");
  if (hasRecent) return summary;

  const live = await checkAPIHealth({ persist: false });
  return live.summary;
}

export async function getDatabaseHealth(): Promise<{
  table_sizes: Record<string, number>;
  slow_queries: number;
  failed_rls_policies: number;
}> {
  const table_sizes: Record<string, number> = {};
  let slow_queries = 0;
  const failed_rls_policies = 0;

  if (!isSupabaseConfigured()) {
    return { table_sizes, slow_queries, failed_rls_policies };
  }

  const admin = createSupabaseAdmin();

  await Promise.all(
    MONITORED_TABLES.map(async (table) => {
      const start = Date.now();
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });
      const elapsed = Date.now() - start;
      if (elapsed > 500) slow_queries++;
      table_sizes[table] = error ? -1 : (count ?? 0);
    })
  );

  return { table_sizes, slow_queries, failed_rls_policies };
}

export async function getRecentErrors(): Promise<RecentError[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await admin
    .from("system_health_logs")
    .select("check_type, status, error_message, checked_at")
    .gte("checked_at", since)
    .in("status", ["down", "degraded"])
    .order("checked_at", { ascending: false })
    .limit(100);

  const grouped = new Map<string, RecentError>();

  for (const row of data ?? []) {
    const key = `${row.check_type}:${row.error_message ?? row.status}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(key, {
        type: row.check_type,
        message: row.error_message ?? `Status: ${row.status}`,
        timestamp: row.checked_at,
        count: 1,
      });
    }
  }

  return Array.from(grouped.values()).slice(0, 20);
}

export async function gatherSystemContext(): Promise<SystemContext> {
  const emptyStats = {
    total_students: 0,
    active_today: 0,
    pending_submissions: 0,
    open_safety_flags: 0,
    low_token_students: 0,
    failed_print_jobs: 0,
  };

  if (!isSupabaseConfigured()) {
    return {
      platform_stats: emptyStats,
      recent_errors: [],
      api_health: {
        supabase: "down",
        openai: "unknown",
        clerk: "unknown",
        meshy: "unknown",
        whatsapp: "unknown",
      },
      database_health: { table_sizes: {}, slow_queries: 0, failed_rls_policies: 0 },
      recent_alerts: [],
      maintenance_due: ["Configure Supabase environment variables"],
    };
  }

  const admin = createSupabaseAdmin();
  const today = todayIso();

  const [
    { data: students },
    { count: pendingCount },
    { count: safetyCount },
    { count: failedPrints },
    { data: lowTokenStudents },
    { data: alerts },
    apiHealth,
    dbHealth,
    recentErrors,
  ] = await Promise.all([
    admin.from("users").select("id, last_login_date").eq("role", "student"),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("safety_flags")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
    admin
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin.from("users").select("id").eq("role", "student").lte("tokens_remaining", 2),
    admin
      .from("learning_alerts")
      .select("id, severity, message, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(10),
    getCachedApiHealth(),
    getDatabaseHealth(),
    getRecentErrors(),
  ]);

  const maintenance_due: string[] = [];
  const sessionLogCount = dbHealth.table_sizes.session_logs ?? 0;
  const healthLogCount = dbHealth.table_sizes.system_health_logs ?? 0;
  const notificationCount = dbHealth.table_sizes.notifications ?? 0;

  if (sessionLogCount > 5000) {
    maintenance_due.push(`Clean session_logs (${sessionLogCount} rows)`);
  }
  if (healthLogCount > 1000) {
    maintenance_due.push(`Clean system_health_logs (${healthLogCount} rows)`);
  }
  if (notificationCount > 10000) {
    maintenance_due.push(`Archive read notifications (${notificationCount} rows)`);
  }
  if ((lowTokenStudents?.length ?? 0) > 0) {
    maintenance_due.push(`Token audit: ${lowTokenStudents?.length} students low on tokens`);
  }
  if (Object.values(apiHealth).some((s) => s === "down")) {
    maintenance_due.push("Investigate down API services");
  }

  return {
    platform_stats: {
      total_students: students?.length ?? 0,
      active_today: (students ?? []).filter((s) => s.last_login_date === today).length,
      pending_submissions: pendingCount ?? 0,
      open_safety_flags: safetyCount ?? 0,
      low_token_students: lowTokenStudents?.length ?? 0,
      failed_print_jobs: failedPrints ?? 0,
    },
    recent_errors: recentErrors,
    api_health: apiHealth,
    database_health: dbHealth,
    recent_alerts: (alerts ?? []).map((a) => ({
      id: a.id,
      severity: a.severity,
      message: a.message,
      created_at: a.created_at,
    })),
    maintenance_due,
  };
}
