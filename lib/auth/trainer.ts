import type { UserRole } from "@/lib/db/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type TrainerContext = {
  userId: string;
  role: "trainer" | "admin";
};

/** Fast role lookup for middleware (service role, bypasses RLS). */
export async function getUserRoleById(
  userId: string
): Promise<UserRole | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.role as UserRole;
  } catch {
    return null;
  }
}

export function isTrainerOrAdminRole(
  role: UserRole | null | undefined
): role is "trainer" | "admin" {
  return role === "trainer" || role === "admin";
}
