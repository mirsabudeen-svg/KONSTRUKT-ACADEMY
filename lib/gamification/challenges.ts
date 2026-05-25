import "server-only";

import { auth } from "@clerk/nextjs/server";

import { awardXP, XP_REWARDS } from "@/lib/gamification/xp-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type DbChallenge = {
  id: string;
  title: string;
  description: string | null;
  module_id: number | null;
  xp_reward: number;
  deadline: string | null;
  created_by: string | null;
  cohort_id: string | null;
  created_at: string;
};

export type StudentChallenge = {
  student_id: string;
  challenge_id: string;
  accepted_at: string;
  completed_at: string | null;
  status: "accepted" | "completed" | "expired";
};

export type ChallengeWithProgress = DbChallenge & {
  student_status?: StudentChallenge["status"] | null;
  accepted_at?: string | null;
  completed_at?: string | null;
};

export async function createChallenge(input: {
  title: string;
  description?: string;
  moduleId?: number;
  xpReward: number;
  deadline?: string;
  cohortId: string;
  createdBy: string;
}): Promise<{ ok: true; challenge: DbChallenge } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from("challenges")
    .insert({
      title: input.title,
      description: input.description ?? null,
      module_id: input.moduleId ?? null,
      xp_reward: input.xpReward,
      deadline: input.deadline ?? null,
      cohort_id: input.cohortId,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, challenge: data as DbChallenge };
}

export async function getChallengesForStudent(
  studentId: string
): Promise<ChallengeWithProgress[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();

  const { data: user } = await admin
    .from("users")
    .select("cohort_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!user?.cohort_id) return [];

  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .eq("cohort_id", user.cohort_id)
    .order("created_at", { ascending: false });

  if (!challenges?.length) return [];

  const { data: studentRows } = await admin
    .from("student_challenges")
    .select("*")
    .eq("student_id", studentId);

  const byChallenge = new Map(
    (studentRows ?? []).map((r) => [r.challenge_id, r as StudentChallenge])
  );

  return (challenges as DbChallenge[]).map((c) => {
    const sc = byChallenge.get(c.id);
    return {
      ...c,
      student_status: sc?.status ?? null,
      accepted_at: sc?.accepted_at ?? null,
      completed_at: sc?.completed_at ?? null,
    };
  });
}

export async function acceptChallenge(
  studentId: string,
  challengeId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();

  const { error } = await admin.from("student_challenges").insert({
    student_id: studentId,
    challenge_id: challengeId,
    status: "accepted",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Challenge already accepted" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function completeChallenge(
  studentId: string,
  challengeId: string
): Promise<{ ok: boolean; error?: string; xp?: number }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();

  const { data: sc } = await admin
    .from("student_challenges")
    .select("*")
    .eq("student_id", studentId)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (!sc || sc.status === "completed") {
    return { ok: false, error: "Challenge not found or already completed" };
  }

  const { data: challenge } = await admin
    .from("challenges")
    .select("xp_reward, title, module_id")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge) {
    return { ok: false, error: "Challenge not found" };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("student_challenges")
    .update({ status: "completed", completed_at: now })
    .eq("student_id", studentId)
    .eq("challenge_id", challengeId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const xp = challenge.xp_reward ?? XP_REWARDS.challenge_completed;
  await awardXP(
    studentId,
    "challenge_completed",
    xp,
    challenge.module_id ?? undefined,
    `Completed: ${challenge.title}`
  );

  return { ok: true, xp };
}

export async function getActiveChallengeCount(studentId: string): Promise<number> {
  const challenges = await getChallengesForStudent(studentId);
  return challenges.filter((c) => c.student_status === "accepted").length;
}

export async function getTrainerCohortId(
  trainerId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();

  const { data: cohort } = await admin
    .from("cohorts")
    .select("id")
    .eq("trainer_id", trainerId)
    .maybeSingle();

  return cohort?.id ?? null;
}

export async function getModulesList(): Promise<
  { id: number; title: string }[]
> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("modules")
    .select("id, title")
    .order("sort_order");

  return (data ?? []) as { id: number; title: string }[];
}

export async function requireStudentId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
