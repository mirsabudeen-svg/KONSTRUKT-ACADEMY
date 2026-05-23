import { auth } from "@clerk/nextjs/server";

import type { DbUser } from "@/lib/db/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const MODULE_COUNT = 10;

export async function ensureStudentProfile(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdmin();

  const { error: userError } = await admin.from("users").upsert(
    { id: userId, role: "student", tokens_remaining: 10 },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (userError) {
    console.error("[ensureStudentProfile] users upsert:", userError.message);
    return;
  }

  const { count, error: countError } = await admin
    .from("progress")
    .select("*", { count: "exact", head: true })
    .eq("student_id", userId);

  if (countError) {
    console.error("[ensureStudentProfile] progress count:", countError.message);
    return;
  }

  if (count && count > 0) return;

  const rows = Array.from({ length: MODULE_COUNT }, (_, i) => {
    const moduleId = i + 1;
    return {
      student_id: userId,
      module_id: moduleId,
      status: moduleId === 1 ? "in_progress" : "locked",
      score: 0,
    };
  });

  const { error: progressError } = await admin.from("progress").insert(rows);

  if (progressError) {
    console.error("[ensureStudentProfile] progress insert:", progressError.message);
  }
}

export async function getCurrentDbUser(): Promise<DbUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await ensureStudentProfile(userId);

  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, role, tokens_remaining, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getCurrentDbUser]", error.message);
    return null;
  }

  return data as DbUser | null;
}
