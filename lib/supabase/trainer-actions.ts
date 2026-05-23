import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import {
  getUserRoleById,
  isTrainerOrAdminRole,
  type TrainerContext,
} from "@/lib/auth/trainer";
import type { PrintQueueStatus } from "@/lib/db/types";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  TOKEN_REFILL_AMOUNT,
  type PrintQueueKanbanItem,
  type TrainerStudentRow,
} from "@/lib/trainer/constants";

export type { PrintQueueKanbanItem, TrainerStudentRow } from "@/lib/trainer/constants";

export async function requireTrainerContext(): Promise<
  TrainerContext | { error: string; status: number }
> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 };

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return { error: "Forbidden — trainer or admin role required", status: 403 };
  }

  return { userId, role };
}

async function resolveClerkDisplayNames(
  userIds: string[]
): Promise<Map<string, { name: string; email: string | null }>> {
  const map = new Map<string, { name: string; email: string | null }>();
  if (userIds.length === 0) return map;

  const clerk = await clerkClient();

  await Promise.all(
    userIds.map(async (id) => {
      try {
        const user = await clerk.users.getUser(id);
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          `Cadet ${id.slice(-6)}`;
        const email = user.emailAddresses[0]?.emailAddress ?? null;
        map.set(id, { name, email });
      } catch {
        map.set(id, { name: `Cadet ${id.slice(-6)}`, email: null });
      }
    })
  );

  return map;
}

export async function fetchPrintQueueKanban(): Promise<PrintQueueKanbanItem[]> {
  if (!isSupabaseConfigured()) return [];

  const ctx = await requireTrainerContext();
  if ("error" in ctx) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("print_queue")
    .select(
      "id, student_id, submission_id, status, printer_assigned, created_at, updated_at"
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[fetchPrintQueueKanban]", error.message);
    return [];
  }

  const studentIds = [...new Set((data ?? []).map((r) => r.student_id))];
  const names = await resolveClerkDisplayNames(studentIds);

  return (data ?? []).map((row) => {
    const profile = names.get(row.student_id);
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: profile?.name ?? `Cadet ${row.student_id.slice(-6)}`,
      studentEmail: profile?.email ?? null,
      submissionId: row.submission_id,
      status: row.status as PrintQueueStatus,
      printerAssigned: row.printer_assigned,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function updatePrintQueueStatus(
  printId: string,
  status: PrintQueueStatus
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return { ok: false, error: ctx.error, status: ctx.status };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client unavailable", status: 503 };
  }

  const { data, error } = await supabase
    .from("print_queue")
    .update({ status })
    .eq("id", printId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[updatePrintQueueStatus]", error.message);
    return { ok: false, error: error.message, status: 500 };
  }

  if (!data) {
    return {
      ok: false,
      error: "Print job not found or access denied",
      status: 404,
    };
  }

  return { ok: true };
}

export async function fetchTrainerStudents(): Promise<TrainerStudentRow[]> {
  if (!isSupabaseConfigured()) return [];

  const ctx = await requireTrainerContext();
  if ("error" in ctx) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("users")
    .select("id, tokens_remaining, cohort_id, created_at, role")
    .eq("role", "student")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[fetchTrainerStudents]", error.message);
    return [];
  }

  const studentIds = (data ?? []).map((u) => u.id);
  const names = await resolveClerkDisplayNames(studentIds);

  return (data ?? []).map((row) => {
    const profile = names.get(row.id);
    return {
      id: row.id,
      displayName: profile?.name ?? `Cadet ${row.id.slice(-6)}`,
      email: profile?.email ?? null,
      tokensRemaining: row.tokens_remaining,
      cohortId: row.cohort_id,
      createdAt: row.created_at,
    };
  });
}

export async function refillStudentTokens(
  studentId: string,
  amount: number = TOKEN_REFILL_AMOUNT
): Promise<
  | { ok: true; tokensRemaining: number; added: number }
  | { ok: false; error: string; status: number }
> {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return { ok: false, error: ctx.error, status: ctx.status };
  }

  if (!studentId?.trim()) {
    return { ok: false, error: "studentId is required", status: 400 };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client unavailable", status: 503 };
  }

  const { data: student, error: fetchError } = await supabase
    .from("users")
    .select("id, tokens_remaining, role")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (fetchError || !student) {
    return {
      ok: false,
      error: "Student not found or not in your cohort",
      status: 404,
    };
  }

  const newBalance = student.tokens_remaining + amount;

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ tokens_remaining: newBalance })
    .eq("id", studentId)
    .select("tokens_remaining")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[refillStudentTokens]", updateError?.message);
    return {
      ok: false,
      error: updateError?.message ?? "Update failed",
      status: 500,
    };
  }

  return {
    ok: true,
    tokensRemaining: updated.tokens_remaining,
    added: amount,
  };
}

export { TOKEN_REFILL_AMOUNT } from "@/lib/trainer/constants";
