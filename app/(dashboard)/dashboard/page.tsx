import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Rocket, Terminal, Sparkles } from "lucide-react";

import { MissionTrack } from "@/components/mission-track";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TokenBadge } from "@/components/token-badge";
import { getMissionTrack } from "@/lib/progress/missions";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "Cadet";
  const track = await getMissionTrack();
  const { summary } = track;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-500/80">
            Command Center
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {summary.completed === 0
              ? "Your first mission is ready. Complete missions in order to unlock the next bay."
              : `${summary.completed} of ${summary.total} missions complete — keep climbing the track.`}
          </p>
        </div>
        <TokenBadge />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-cyan-300">
            Mission progress
          </h2>
          <Link
            href="/missions"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            View full track
          </Link>
        </div>
        <MissionTrack compact showHeader showActiveBanner data={track} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickCard
          href="/missions"
          icon={Rocket}
          title="All Missions"
          description="Open the full 10-step curriculum track."
          accent="cyan"
        />
        <QuickCard
          href="/ai-terminal"
          icon={Terminal}
          title="AI Terminal"
          description="Generate arm code & 3D models. Each run costs 1 AI token."
          accent="violet"
        />
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="size-5" aria-hidden />
            <h3 className="font-display font-semibold">Token Economy</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Out of tokens? Ask your Trainer for a refill at the academy station.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: "cyan" | "violet";
}) {
  const border =
    accent === "cyan" ? "border-cyan-500/20" : "border-violet-500/20";
  const iconColor = accent === "cyan" ? "text-cyan-400" : "text-violet-400";

  return (
    <div
      className={`flex flex-col rounded-xl border ${border} bg-card/40 p-6 backdrop-blur-sm`}
    >
      <Icon className={`size-8 ${iconColor}`} aria-hidden />
      <h3 className="font-display mt-4 font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-fit")}
      >
        Open
      </Link>
    </div>
  );
}
