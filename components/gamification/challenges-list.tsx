"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Clock, Target, Zap } from "lucide-react";

import { dispatchXPEarned } from "@/components/gamification/login-xp-tracker";
import { NoChallenges } from "@/components/empty/empty-state";
import { Button } from "@/components/ui/button";
import type { ChallengeWithProgress } from "@/lib/gamification/challenges";
import { cn } from "@/lib/utils";

type ChallengesListProps = {
  challenges: ChallengeWithProgress[];
};

function deadlineProgress(deadline: string | null, acceptedAt: string | null) {
  if (!deadline || !acceptedAt) return null;
  const start = new Date(acceptedAt).getTime();
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return { pct, daysLeft, expired: now > end };
}

export function ChallengesList({ challenges }: ChallengesListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const active = challenges.filter(
    (c) => !c.student_status || c.student_status === "accepted"
  );
  const completed = challenges.filter((c) => c.student_status === "completed");

  async function accept(challengeId: string) {
    setLoading(challengeId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/accept`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function complete(challengeId: string, xpReward: number) {
    setLoading(challengeId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        dispatchXPEarned(data.xp ?? xpReward, "challenge_completed");
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
          <Target className="size-5 text-cyan-400" aria-hidden />
          Active Challenges
        </h2>
        {active.length === 0 ? (
          <NoChallenges />
        ) : (
          <div className="space-y-3">
            {active.map((c) => {
              const progress = deadlineProgress(c.deadline, c.accepted_at ?? null);
              const isAccepted = c.student_status === "accepted";

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-cyan-500/15 bg-zinc-950/50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display font-semibold">{c.title}</h3>
                      {c.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-1 text-xs text-cyan-400">
                        <Zap className="size-3" aria-hidden />
                        {c.xp_reward} XP reward
                      </p>
                    </div>
                    {!c.student_status && (
                      <Button
                        size="sm"
                        onClick={() => accept(c.id)}
                        disabled={loading === c.id}
                      >
                        Accept Challenge
                      </Button>
                    )}
                    {isAccepted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => complete(c.id, c.xp_reward)}
                        disabled={loading === c.id}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                  {progress && isAccepted && (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" aria-hidden />
                          {progress.expired
                            ? "Deadline passed"
                            : `${progress.daysLeft} days left`}
                        </span>
                        <span>{Math.round(progress.pct)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            progress.expired ? "bg-red-500" : "bg-cyan-500"
                          )}
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="size-5 text-emerald-400" aria-hidden />
            Completed
          </h2>
          <div className="space-y-2">
            {completed.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
              >
                <span className="font-medium">{c.title}</span>
                <span className="font-mono text-sm text-emerald-400">
                  +{c.xp_reward} XP
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
