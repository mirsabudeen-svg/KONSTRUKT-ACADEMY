import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Circle,
  Lock,
  Rocket,
} from "lucide-react";

import { MissionSubmitForm } from "@/components/missions/mission-submit-form";
import { buttonVariants } from "@/components/ui/button";
import { getMissionChecklist } from "@/lib/missions/briefs";
import { getMissionById } from "@/lib/progress/missions";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MissionDetailPage({ params }: PageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id < 1 || id > 10) {
    notFound();
  }

  const mission = await getMissionById(id);
  if (!mission) notFound();

  const checklist = getMissionChecklist(id);
  const isPendingReview = mission.displayStatus === "pending_review";
  const isCompleted = mission.displayStatus === "completed";
  const canSubmit =
    mission.unlocked && !isPendingReview && !isCompleted;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
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

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 via-card/60 to-violet-950/30 p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-cyan-500/10 blur-3xl" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/90">
          Mission {mission.id} / 10
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-wide md:text-4xl">
          {mission.title}
        </h1>
        {mission.description && (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {mission.description}
          </p>
        )}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2">
          <Award className="size-4 text-violet-300" aria-hidden />
          <span className="text-sm text-violet-200">
            Badge:{" "}
            <span className="font-semibold text-violet-100">
              {mission.badge_name}
            </span>
          </span>
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Status: {mission.displayStatus.replace(/_/g, " ")}
        </p>
      </section>

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
        <>
          {/* Mission Brief */}
          <section className="rounded-xl border border-cyan-500/15 bg-card/40 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Rocket className="size-5 text-cyan-400" aria-hidden />
              <h2 className="font-display text-xl font-semibold">
                Mission Brief
              </h2>
            </div>
            {mission.description && (
              <p className="mt-4 text-muted-foreground">{mission.description}</p>
            )}
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-cyan-500/80">
              Checklist
            </h3>
            <ul className="mt-3 space-y-2">
              {checklist.map((task) => (
                <li
                  key={task}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 text-sm"
                >
                  <Circle
                    className="mt-0.5 size-4 shrink-0 text-cyan-500/50"
                    aria-hidden
                  />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Submit */}
          <section className="rounded-xl border border-violet-500/20 bg-card/40 p-6 backdrop-blur-sm">
            <h2 className="font-display text-xl font-semibold text-violet-200">
              Submit Your Work
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste your code or upload an STL/image. Your trainer will review
              and approve before the next mission unlocks.
            </p>

            <div className="mt-6">
              {isPendingReview ? (
                <div className="flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-10 text-center">
                  <CheckCircle2
                    className="size-10 text-amber-400"
                    aria-hidden
                  />
                  <p className="font-display mt-4 text-lg font-semibold text-amber-200">
                    Submitted! Waiting for Trainer Review ✅
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Hang tight — your trainer is reviewing this mission.
                  </p>
                </div>
              ) : isCompleted ? (
                <div className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-10 text-center">
                  <CheckCircle2
                    className="size-10 text-emerald-400"
                    aria-hidden
                  />
                  <p className="font-display mt-4 text-lg font-semibold text-emerald-300">
                    Mission complete
                  </p>
                  {mission.progress?.score != null && (
                    <p className="mt-2 font-mono text-sm text-muted-foreground">
                      Score: {mission.progress.score}%
                    </p>
                  )}
                </div>
              ) : (
                <MissionSubmitForm moduleId={id} disabled={!canSubmit} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
