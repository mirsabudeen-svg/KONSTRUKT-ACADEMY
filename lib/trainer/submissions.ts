import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { SubmissionStatus, SubmissionType } from "@/lib/db/types";
import type { CodeReviewSummary } from "@/lib/ai/types";
import { fetchCodeReviewForSubmission } from "@/lib/ai/code-reviewer";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type TrainerSubmissionRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl: string | null;
  moduleId: number;
  moduleTitle: string;
  badgeName: string;
  submissionType: SubmissionType;
  contentUrl: string | null;
  status: SubmissionStatus;
  feedback: string | null;
  score: number | null;
  submittedAt: string;
  reviewedAt: string | null;
  aiPreScore: number | null;
  aiWarning: boolean;
  trainerNotes: string | null;
  codeReview: CodeReviewSummary | null;
};

async function resolveClerkProfiles(
  userIds: string[]
): Promise<
  Map<string, { name: string; avatarUrl: string | null }>
> {
  const map = new Map<string, { name: string; avatarUrl: string | null }>();
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
        map.set(id, { name, avatarUrl: user.imageUrl ?? null });
      } catch {
        map.set(id, { name: `Cadet ${id.slice(-6)}`, avatarUrl: null });
      }
    })
  );

  return map;
}

export async function fetchTrainerSubmissions(
  statusFilter?: SubmissionStatus | "all"
): Promise<TrainerSubmissionRow[]> {
  if (!isSupabaseConfigured()) return [];

  const ctx = await requireTrainerContext();
  if ("error" in ctx) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("submissions")
    .select(
      `
      id,
      student_id,
      module_id,
      submission_type,
      content_url,
      status,
      feedback,
      trainer_feedback,
      score,
      submitted_at,
      reviewed_at,
      ai_pre_score,
      ai_warning,
      trainer_notes,
      modules!inner (
        title,
        badge_name
      )
    `
    )
    .order("submitted_at", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchTrainerSubmissions]", error.message);
    return [];
  }

  const studentIds = [...new Set((data ?? []).map((r) => r.student_id))];
  const profiles = await resolveClerkProfiles(studentIds);

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const moduleData = row.modules;
      const modRow = Array.isArray(moduleData) ? moduleData[0] : moduleData;
      const profile = profiles.get(row.student_id);
      const codeReview = await fetchCodeReviewForSubmission(row.id);

      return {
        id: row.id,
        studentId: row.student_id,
        studentName: profile?.name ?? `Cadet ${row.student_id.slice(-6)}`,
        studentAvatarUrl: profile?.avatarUrl ?? null,
        moduleId: row.module_id,
        moduleTitle: modRow?.title ?? `Mission ${row.module_id}`,
        badgeName: modRow?.badge_name ?? "Badge",
        submissionType: row.submission_type as SubmissionType,
        contentUrl: row.content_url,
        status: row.status as SubmissionStatus,
        feedback: row.feedback ?? row.trainer_feedback,
        score: row.score,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        aiPreScore: row.ai_pre_score ?? codeReview?.aiScore ?? null,
        aiWarning: row.ai_warning ?? false,
        trainerNotes: row.trainer_notes ?? null,
        codeReview,
      };
    })
  );

  return rows;
}

export async function fetchPendingSubmissionCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const ctx = await requireTrainerContext();
  if ("error" in ctx) return 0;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    console.error("[fetchPendingSubmissionCount]", error.message);
    return 0;
  }

  return count ?? 0;
}
