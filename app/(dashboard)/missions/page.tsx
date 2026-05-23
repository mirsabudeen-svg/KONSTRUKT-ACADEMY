import { MissionTrack } from "@/components/mission-track";

export default function MissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-500/80">
          Mission Track
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          10-Module Curriculum
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Complete each mission in order. Mission{" "}
          <span className="font-mono text-cyan-400">N+1</span> stays locked until
          Mission <span className="font-mono text-cyan-400">N</span> is marked
          complete.
        </p>
      </div>

      <MissionTrack />
    </div>
  );
}
