import { auth } from "@clerk/nextjs/server";

import type { MissionModule } from "@/lib/db/types";
import {
  buildMissionModules,
  getFallbackMissions,
  getMissionSummary,
} from "@/lib/progress/unlock";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureStudentProfile } from "@/lib/user";

export type MissionTrackData = {
  missions: MissionModule[];
  summary: ReturnType<typeof getMissionSummary>;
  source: "supabase" | "fallback";
};

export async function getMissionTrack(): Promise<MissionTrackData> {
  const { userId } = await auth();

  if (!userId || !isSupabaseConfigured()) {
    const missions = getFallbackMissions();
    return {
      missions,
      summary: getMissionSummary(missions),
      source: "fallback",
    };
  }

  await ensureStudentProfile(userId);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const missions = getFallbackMissions();
    return {
      missions,
      summary: getMissionSummary(missions),
      source: "fallback",
    };
  }

  const [modulesResult, progressResult] = await Promise.all([
    supabase.from("modules").select("*").order("sort_order", { ascending: true }),
    supabase.from("progress").select("*").eq("student_id", userId),
  ]);

  if (modulesResult.error || !modulesResult.data?.length) {
    console.error("[getMissionTrack] modules:", modulesResult.error?.message);
    const missions = getFallbackMissions();
    return {
      missions,
      summary: getMissionSummary(missions),
      source: "fallback",
    };
  }

  const missions = buildMissionModules(
    modulesResult.data,
    progressResult.data ?? []
  );

  return {
    missions,
    summary: getMissionSummary(missions),
    source: "supabase",
  };
}

export async function getMissionById(
  moduleId: number
): Promise<MissionModule | null> {
  const { missions } = await getMissionTrack();
  return missions.find((m) => m.id === moduleId) ?? null;
}
