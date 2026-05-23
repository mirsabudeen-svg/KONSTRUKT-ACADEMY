import { MissionTrackView, ActiveMissionBanner } from "@/components/mission-track-view";
import {
  getMissionTrack,
  type MissionTrackData,
} from "@/lib/progress/missions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type MissionTrackProps = {
  compact?: boolean;
  showHeader?: boolean;
  showActiveBanner?: boolean;
  /** Avoid duplicate Supabase round-trips when parent already loaded track */
  data?: MissionTrackData;
};

export async function MissionTrack({
  compact = false,
  showHeader = true,
  showActiveBanner = false,
  data: prefetched,
}: MissionTrackProps) {
  const { missions, summary, source } = prefetched ?? (await getMissionTrack());

  return (
    <div className="space-y-4">
      {!isSupabaseConfigured() && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200/90">
          Supabase not configured — showing demo mission track. Add env vars and
          run migrations to enable live progress.
        </p>
      )}
      {source === "supabase" && showActiveBanner && summary.activeMission && (
        <ActiveMissionBanner mission={summary.activeMission} />
      )}
      <MissionTrackView
        missions={missions}
        compact={compact}
        showHeader={showHeader}
        completedCount={summary.completed}
        total={summary.total}
        percent={summary.percent}
      />
    </div>
  );
}
