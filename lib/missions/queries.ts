import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { DbSubmission } from "@/lib/db/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function getLatestModuleSubmission(
  moduleId: number
): Promise<DbSubmission | null> {
  const { userId } = await auth();
  if (!userId || !isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", userId)
    .eq("module_id", moduleId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLatestModuleSubmission]", error.message);
    return null;
  }

  return data as DbSubmission | null;
}
