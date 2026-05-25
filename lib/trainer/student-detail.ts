import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { analyzeStudentProgress } from "@/lib/ai/adaptive-learning";
import type { CodeReviewResult, RiskLevel } from "@/lib/ai/types";
import type { ProgressStatus, SubmissionStatus } from "@/lib/db/types";
import { buildMissionModules } from "@/lib/progress/unlock";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type TrainerNoteRow = {
  id: string;
  trainerId: string;
  studentId: string;
  note: string;
  noteType: "general" | "concern" | "achievement" | "reminder";
  createdAt: string;
};

export type StudentSubmissionHistoryRow = {
  id: string;
  moduleId: number;
  moduleTitle: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type StudentDetailData = {
  studentId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  tokensRemaining: number;
  totalXp: number;
  level: string;
  currentStreak: number;
  lastLoginDate: string | null;
  currentModuleId: number | null;
  currentModuleTitle: string | null;
  currentModuleStatus: ProgressStatus | null;
  completionPercent: number;
  averageScore: number | null;
  riskLevel: RiskLevel;
  riskFactors: string[];
  missions: {
    id: number;
    title: string;
    displayStatus: string;
    score: number | null;
  }[];
  submissions: StudentSubmissionHistoryRow[];
  tutorConversationCount: number;
  tutorMessageCount: number;
  lastTutorInteraction: string | null;
  tutorTopics: string[];
  notes: TrainerNoteRow[];
};

export async function fetchTrainerNotes(
  studentId: string
): Promise<TrainerNoteRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("trainer_notes")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    trainerId: row.trainer_id,
    studentId: row.student_id,
    note: row.note,
    noteType: row.note_type as TrainerNoteRow["noteType"],
    createdAt: row.created_at,
  }));
}

export async function fetchStudentDetail(
  studentId: string
): Promise<StudentDetailData | null> {
  if (!isSupabaseConfigured()) return null;

  const ctx = await requireTrainerContext();
  if ("error" in ctx) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const admin = createSupabaseAdmin();

  const { data: user } = await admin
    .from("users")
    .select(
      "id, tokens_remaining, total_xp, level, current_streak, last_login_date"
    )
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (!user) return null;

  let name = `Cadet ${studentId.slice(-6)}`;
  let email: string | null = null;
  let avatarUrl: string | null = null;

  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(studentId);
    name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      name;
    email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
    avatarUrl = clerkUser.imageUrl ?? null;
  } catch {
    /* use defaults */
  }

  const [modulesResult, progressResult, submissionsResult, notes, risk] =
    await Promise.all([
      supabase.from("modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("progress").select("*").eq("student_id", studentId),
      supabase
        .from("submissions")
        .select(
          "id, module_id, status, score, feedback, trainer_feedback, submitted_at, reviewed_at, modules(title)"
        )
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false }),
      fetchTrainerNotes(studentId),
      analyzeStudentProgress(studentId),
    ]);

  const missions = buildMissionModules(
    modulesResult.data ?? [],
    progressResult.data ?? []
  );

  const completed = missions.filter((m) => m.displayStatus === "completed");
  const completionPercent = Math.round((completed.length / 10) * 100);

  const scores = completed
    .map((m) => m.progress?.score)
    .filter((s): s is number => s != null);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const activeMission =
    missions.find((m) =>
      ["in_progress", "pending_review", "ready"].includes(m.displayStatus)
    ) ?? missions.find((m) => m.displayStatus === "completed");

  const { data: conversations } = await admin
    .from("tutor_conversations")
    .select("id, updated_at")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false });

  const convIds = (conversations ?? []).map((c) => c.id);
  let tutorMessageCount = 0;
  if (convIds.length > 0) {
    const { count } = await admin
      .from("tutor_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds);
    tutorMessageCount = count ?? 0;
  }

  const { data: memoryRows } = await admin
    .from("tutor_memory")
    .select("content, memory_type")
    .eq("student_id", studentId)
    .in("memory_type", ["struggled_concept", "common_mistake"])
    .order("updated_at", { ascending: false })
    .limit(8);

  const tutorTopics = [
    ...new Set((memoryRows ?? []).map((m) => m.content as string)),
  ].slice(0, 5);

  const submissions: StudentSubmissionHistoryRow[] = (submissionsResult.data ?? []).map(
    (row) => {
      const mod = row.modules;
      const modRow = Array.isArray(mod) ? mod[0] : mod;
      return {
        id: row.id,
        moduleId: row.module_id,
        moduleTitle: modRow?.title ?? `Mission ${row.module_id}`,
        status: row.status as SubmissionStatus,
        score: row.score,
        feedback: row.feedback ?? row.trainer_feedback,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
      };
    }
  );

  return {
    studentId,
    name,
    email,
    avatarUrl,
    tokensRemaining: user.tokens_remaining,
    totalXp: user.total_xp ?? 0,
    level: user.level ?? "Rookie Builder",
    currentStreak: user.current_streak ?? 0,
    lastLoginDate: user.last_login_date,
    currentModuleId: activeMission?.id ?? null,
    currentModuleTitle: activeMission?.title ?? null,
    currentModuleStatus: activeMission?.progress?.status ?? null,
    completionPercent,
    averageScore,
    riskLevel: risk.risk_level,
    riskFactors: risk.risk_factors,
    missions: missions.map((m) => ({
      id: m.id,
      title: m.title,
      displayStatus: m.displayStatus,
      score: m.progress?.score ?? null,
    })),
    submissions,
    tutorConversationCount: conversations?.length ?? 0,
    tutorMessageCount,
    lastTutorInteraction: conversations?.[0]?.updated_at ?? null,
    tutorTopics,
    notes,
  };
}

export async function createTrainerNote(input: {
  trainerId: string;
  studentId: string;
  note: string;
  noteType: TrainerNoteRow["noteType"];
}): Promise<{ ok: true; note: TrainerNoteRow } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database unavailable" };
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("trainer_notes")
    .insert({
      trainer_id: input.trainerId,
      student_id: input.studentId,
      note: input.note.trim(),
      note_type: input.noteType,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save note" };
  }

  return {
    ok: true,
    note: {
      id: data.id,
      trainerId: data.trainer_id,
      studentId: data.student_id,
      note: data.note,
      noteType: data.note_type as TrainerNoteRow["noteType"],
      createdAt: data.created_at,
    },
  };
}

export async function deleteTrainerNote(
  noteId: string,
  trainerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database unavailable" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("trainer_notes")
    .delete()
    .eq("id", noteId)
    .eq("trainer_id", trainerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type AiReviewSummaryResponse = {
  aiScore: number | null;
  passed: boolean;
  issues: CodeReviewResult["issues"];
  hardwareViolations: CodeReviewResult["hardware_violations"];
  suggestions: string[];
  positiveFeedback: string | null;
  summary: string | null;
};

export async function fetchAiReviewSummary(
  submissionId: string
): Promise<AiReviewSummaryResponse | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("code_reviews")
    .select("*")
    .eq("submission_id", submissionId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    aiScore: data.ai_score,
    passed: data.passed ?? false,
    issues: Array.isArray(data.issues) ? data.issues : [],
    hardwareViolations: Array.isArray(data.hardware_violations)
      ? data.hardware_violations
      : [],
    suggestions: Array.isArray(data.suggestions) ? (data.suggestions as string[]) : [],
    positiveFeedback: data.positive_feedback,
    summary: data.summary,
  };
}

export async function markSubmissionOpened(
  submissionId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("submissions")
    .select("opened_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (data?.opened_at) return;

  await admin
    .from("submissions")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", submissionId);
}
