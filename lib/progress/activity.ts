import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/progress/stats";

export type ActivityItem = {
  id: string;
  message: string;
  timestamp: string;
  relative: string;
};

export async function getRecentActivity(limit = 5): Promise<ActivityItem[]> {
  const { userId } = await auth();
  if (!userId || !isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const items: ActivityItem[] = [];

  const [progressResult, modulesResult, tutorResult] = await Promise.all([
    supabase
      .from("progress")
      .select("module_id, status, score, updated_at")
      .eq("student_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase.from("modules").select("id, title, badge_name"),
    supabase
      .from("tutor_conversations")
      .select("id, updated_at")
      .eq("student_id", userId)
      .gte(
        "updated_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  const moduleMap = new Map(
    (modulesResult.data ?? []).map((m) => [m.id, m])
  );

  if (progressResult.data) {
    for (const row of progressResult.data) {
      const mod = moduleMap.get(row.module_id);
      items.push({
        id: `progress-${row.module_id}`,
        message:
          row.score != null
            ? `Module ${row.module_id} completed — Score: ${row.score}`
            : `Module ${row.module_id} completed`,
        timestamp: row.updated_at,
        relative: formatRelativeTime(row.updated_at),
      });

      const badgeName = mod?.badge_name;
      if (badgeName) {
        items.push({
          id: `badge-${row.module_id}`,
          message: `Module ${row.module_id} badge earned — ${badgeName}`,
          timestamp: row.updated_at,
          relative: formatRelativeTime(row.updated_at),
        });
      }
    }
  }

  const tutorCount = tutorResult.data?.length ?? 0;
  if (tutorCount > 0) {
    const latest = tutorResult.data!.reduce((a, b) =>
      a.updated_at > b.updated_at ? a : b
    );
    items.push({
      id: "tutor-week",
      message: `AI Tutor: ${tutorCount} conversation${tutorCount === 1 ? "" : "s"} this week`,
      timestamp: latest.updated_at,
      relative: formatRelativeTime(latest.updated_at),
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}
