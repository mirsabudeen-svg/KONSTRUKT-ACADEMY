import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Circle,
  Clock,
  FileBox,
  Lock,
  Rocket,
  Sparkles,
  Unlock,
} from "lucide-react";

import { MissionDetailClient } from "@/components/missions/mission-detail-client";
import { MissionCelebrationGateLazy } from "@/components/progress/completion-celebration-lazy";
import TutorChatWidget from "@/components/tutor/tutor-chat-widget";
import { buttonVariants } from "@/components/ui/button";
import { getMissionChecklist } from "@/lib/missions/briefs";
import { getLatestModuleSubmission } from "@/lib/missions/queries";
import {
  parseSubmissionContent,
  submissionTypeLabel,
} from "@/lib/missions/submission-display";
import { getMissionById } from "@/lib/progress/missions";
import { getMissionHardwareType } from "@/lib/hardware/mission-types";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ completed?: string }>;
};

function SubmissionPreview({
  submissionType,
  contentUrl,
}: {
  submissionType: import("@/lib/db/types").SubmissionType;
  contentUrl: string | null;
}) {
  const preview = parseSubmissionContent(submissionType, contentUrl);

  return (
    <div className="mt-4 rounded-lg border border-white/5 bg-black/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your submission · {submissionTypeLabel(submissionType)}
      </p>
      {preview.kind === "stl" ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <FileBox className="size-4 text-violet-400" aria-hidden />
          <span>STL File</span>
          {preview.fileUrl && (
            <a
              href={preview.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Download
            </a>
          )}
        </div>
      ) : (
        <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs leading-relaxed text-cyan-100/90">
          {preview.content}
        </pre>
      )}
    </div>
  );
}

export default async function MissionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id: idParam } = await params;
  const { completed: completedParam } = await searchParams;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id < 1 || id > 10) {
    notFound();
  }

  const mission = await getMissionById(id);
  if (!mission) notFound();

  const { userId } = await auth();
  const latestSubmission = await getLatestModuleSubmission(id);

  const checklist = getMissionChecklist(id);
  const status = mission.displayStatus;
  const isPendingReview = status === "pending_review";
  const isCompleted = status === "completed";
  const isReady = status === "ready";
  const isRejected =
    latestSubmission?.status === "rejected" && status === "in_progress";
  const submissionFeedback =
    latestSubmission?.feedback ?? latestSubmission?.trainer_feedback ?? null;
  const canSubmit =
    mission.unlocked &&
    !isPendingReview &&
    !isCompleted &&
    (status === "in_progress" || status === "available" || status === "ready");

  const showCelebration = completedParam === "true";
  const hardwareType = getMissionHardwareType(id, mission.mission_layer);
  const showHardwareTools = hardwareType !== "general";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {showCelebration && (
        <MissionCelebrationGateLazy
          moduleId={id}
          badgeName={mission.badge_name}
          moduleTitle={mission.title}
          score={mission.progress?.score ?? latestSubmission?.score}
          completed
        />
      )}
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
          {isReady && (
            <div className="animate-pulse rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-6 py-8 text-center">
              <Unlock className="mx-auto size-10 text-cyan-400" aria-hidden />
              <p className="font-display mt-4 text-xl font-bold text-cyan-200">
                🔓 Mission Unlocked!
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This mission is ready. Review the brief below and start building.
              </p>
            </div>
          )}

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

            {isReady && (
              <div className="mt-6">
                <Link
                  href={`#submit`}
                  className={cn(
                    buttonVariants(),
                    "gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  )}
                >
                  <Sparkles className="size-4" aria-hidden />
                  Start Mission
                </Link>
              </div>
            )}
          </section>

          {/* Submit / Review status */}
          <section
            id="submit"
            className="rounded-xl border border-violet-500/20 bg-card/40 p-6 backdrop-blur-sm"
          >
            <h2 className="font-display text-xl font-semibold text-violet-200">
              Submit Your Work
            </h2>

            {isPendingReview ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-8 text-center">
                  <Clock className="size-10 text-amber-400" aria-hidden />
                  <p className="font-display mt-4 text-lg font-semibold text-amber-200">
                    ⏳ Awaiting Trainer Review
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your submission is being reviewed. You cannot resubmit until
                    your trainer responds.
                  </p>
                </div>
                {latestSubmission && (
                  <SubmissionPreview
                    submissionType={latestSubmission.submission_type}
                    contentUrl={latestSubmission.content_url}
                  />
                )}
              </div>
            ) : isCompleted ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8 text-center">
                  <CheckCircle2
                    className="size-10 text-emerald-400"
                    aria-hidden
                  />
                  <p className="font-display mt-4 text-xl font-bold text-emerald-300">
                    ✅ Mission Complete!
                  </p>
                  {(mission.progress?.score ?? latestSubmission?.score) !=
                    null && (
                    <p className="mt-2 font-mono text-lg text-emerald-200">
                      Score:{" "}
                      {mission.progress?.score ?? latestSubmission?.score}/100
                    </p>
                  )}
                  <p className="mt-2 text-sm text-violet-200">
                    Badge earned:{" "}
                    <span className="font-semibold">{mission.badge_name}</span>
                  </p>
                  {submissionFeedback && (
                    <p className="mt-4 max-w-md rounded-lg border border-emerald-500/20 bg-black/20 px-4 py-3 text-sm text-muted-foreground">
                      Trainer feedback: {submissionFeedback}
                    </p>
                  )}
                  {id < 10 && (
                    <Link
                      href={`/missions/${id + 1}`}
                      className={cn(
                        buttonVariants(),
                        "mt-6 gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      )}
                    >
                      Next mission
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </div>
                {latestSubmission && (
                  <SubmissionPreview
                    submissionType={latestSubmission.submission_type}
                    contentUrl={latestSubmission.content_url}
                  />
                )}
              </div>
            ) : isRejected ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-6">
                  <p className="font-display text-lg font-semibold text-red-300">
                    📝 Revision Required
                  </p>
                  {submissionFeedback && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Trainer feedback:{" "}
                      <span className="text-red-200">{submissionFeedback}</span>
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Update your work and submit again for review.
                  </p>
                </div>

                {latestSubmission && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Previous submission (reference)
                    </p>
                    <SubmissionPreview
                      submissionType={latestSubmission.submission_type}
                      contentUrl={latestSubmission.content_url}
                    />
                  </div>
                )}

                <MissionDetailClient
                  moduleId={id}
                  missionLayer={mission.mission_layer}
                  canSubmit={canSubmit}
                  showHardwareTools={showHardwareTools}
                />
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Paste your code or upload an STL/image. Your trainer will review
                  and approve before the next mission unlocks.
                </p>
                <div className="mt-6">
                  <MissionDetailClient
                    moduleId={id}
                    missionLayer={mission.mission_layer}
                    canSubmit={canSubmit}
                    showHardwareTools={showHardwareTools}
                  />
                </div>
              </>
            )}
          </section>
        </>
      )}

      {mission.unlocked && userId && (
        <TutorChatWidget
          moduleId={id}
          studentId={userId}
          moduleTitle={mission.title}
        />
      )}
    </div>
  );
}
