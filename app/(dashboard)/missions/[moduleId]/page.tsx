import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getMissionById } from "@/lib/progress/missions";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function MissionDetailPage({ params }: PageProps) {
  const { moduleId } = await params;
  const id = Number(moduleId);

  if (!Number.isInteger(id) || id < 1 || id > 10) {
    notFound();
  }

  const mission = await getMissionById(id);
  if (!mission) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/missions"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-2"
        )}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to track
      </Link>

      <div>
        <p className="font-mono text-sm text-cyan-500/80">Mission {mission.id}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{mission.title}</h1>
        {mission.description && (
          <p className="mt-3 text-muted-foreground">{mission.description}</p>
        )}
        <p className="mt-2 text-sm text-violet-300/90">
          Earn badge: <span className="font-semibold">{mission.badge_name}</span>
        </p>
      </div>

      {!mission.unlocked ? (
        <div className="flex flex-col items-center rounded-xl border border-zinc-700/50 bg-zinc-900/40 px-6 py-12 text-center">
          <Lock className="size-10 text-zinc-500" aria-hidden />
          <p className="font-display mt-4 text-lg font-semibold text-zinc-300">
            Mission locked
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Finish Mission {mission.id - 1} before this bay opens.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-cyan-500/20 bg-card/40 p-6">
          <p className="text-sm uppercase tracking-widest text-cyan-400/80">
            Status: {mission.displayStatus.replace("_", " ")}
          </p>
          <p className="mt-4 text-muted-foreground">
            Mission content and activities will ship in a later phase. Your
            progress is saved in Supabase when trainers mark missions complete.
          </p>
          {mission.progress?.score ? (
            <p className="mt-2 font-mono text-sm">
              Score: {mission.progress.score}%
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
