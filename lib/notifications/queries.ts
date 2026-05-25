import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { DbNotification } from "@/lib/db/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function fetchStudentNotifications(
  unreadOnly = false
): Promise<DbNotification[]> {
  const { userId } = await auth();
  if (!userId || !isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchStudentNotifications]", error.message);
    return [];
  }

  return (data ?? []) as DbNotification[];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { userId } = await auth();
  if (!userId || !isSupabaseConfigured()) return 0;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId)
    .eq("read", false);

  if (error) {
    console.error("[fetchUnreadNotificationCount]", error.message);
    return 0;
  }

  return count ?? 0;
}
