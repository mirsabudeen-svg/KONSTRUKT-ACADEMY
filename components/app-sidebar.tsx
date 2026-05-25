"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { TokenBadgeClient } from "@/components/token-badge-client";
import { XPBar } from "@/components/gamification/xp-bar";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ADMIN_NAV,
  APP_NAME,
  APP_TAGLINE,
  MAIN_NAV,
  TRAINER_SUBMISSIONS_NAV,
  TRAINER_CHALLENGES_NAV,
} from "@/lib/constants";
import type { StudentXPData } from "@/lib/gamification/types";
import { cn } from "@/lib/utils";
import type { MissionModule } from "@/lib/db/types";

type ProgressSummaryData = {
  missions: MissionModule[];
  completedCount: number;
  totalScore: number;
  tokens: number;
};

type AppSidebarProps = {
  tokens: number;
  isTrainer?: boolean;
  pendingSubmissions?: number;
  progressSummary?: ProgressSummaryData;
  xpData?: StudentXPData | null;
  streak?: number;
};

export function AppSidebar({
  tokens,
  isTrainer = false,
  pendingSubmissions = 0,
  progressSummary,
  xpData,
  streak = 0,
}: AppSidebarProps) {
  const pathname = usePathname();

  const navLinkClass = (href: string, basePath?: boolean) => {
    const active =
      pathname === href ||
      (!basePath && href !== "/dashboard" && pathname.startsWith(href));
    return cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
      active
        ? "bg-cyan-500/15 text-cyan-300 shadow-[0_0_20px_-5px] shadow-cyan-500/30"
        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
    );
  };

  return (
    <aside className="relative z-10 flex h-full w-64 shrink-0 flex-col border-r border-cyan-500/15 bg-sidebar/80 backdrop-blur-xl">
      <div className="flex flex-col gap-1 p-5">
        <Link href="/dashboard" className="group">
          <span className="font-display text-lg font-bold tracking-[0.2em] text-cyan-400 transition-colors group-hover:text-cyan-300">
            {APP_NAME}
          </span>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {APP_TAGLINE}
          </p>
        </Link>
      </div>

      <Separator className="bg-cyan-500/10" />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(
                  item.href,
                  item.href === "/dashboard"
                )}
                title={item.description}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}

          {isTrainer && (
            <>
              <Separator className="my-3 bg-cyan-500/10" />
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-violet-400/80">
                Trainer
              </p>
              <Link
                href={ADMIN_NAV.href}
                className={cn(
                  navLinkClass(ADMIN_NAV.href),
                  pathname.startsWith(ADMIN_NAV.href) &&
                    "bg-violet-500/15 text-violet-300 shadow-none"
                )}
                title={ADMIN_NAV.description}
              >
                <ADMIN_NAV.icon className="size-4 shrink-0" aria-hidden />
                <span className="font-medium">{ADMIN_NAV.title}</span>
              </Link>
              <Link
                href={TRAINER_SUBMISSIONS_NAV.href}
                className={cn(
                  navLinkClass(TRAINER_SUBMISSIONS_NAV.href),
                  pathname.startsWith(TRAINER_SUBMISSIONS_NAV.href) &&
                    "bg-violet-500/15 text-violet-300 shadow-none"
                )}
                title={TRAINER_SUBMISSIONS_NAV.description}
              >
                <TRAINER_SUBMISSIONS_NAV.icon className="size-4 shrink-0" aria-hidden />
                <span className="flex flex-1 items-center justify-between font-medium">
                  {TRAINER_SUBMISSIONS_NAV.title}
                  {pendingSubmissions > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {pendingSubmissions}
                    </span>
                  )}
                </span>
              </Link>
              <Link
                href={TRAINER_CHALLENGES_NAV.href}
                className={cn(
                  navLinkClass(TRAINER_CHALLENGES_NAV.href),
                  pathname.startsWith(TRAINER_CHALLENGES_NAV.href) &&
                    "bg-violet-500/15 text-violet-300 shadow-none"
                )}
                title={TRAINER_CHALLENGES_NAV.description}
              >
                <TRAINER_CHALLENGES_NAV.icon className="size-4 shrink-0" aria-hidden />
                <span className="font-medium">{TRAINER_CHALLENGES_NAV.title}</span>
              </Link>
            </>
          )}
        </nav>
      </ScrollArea>

      <div className="mt-auto space-y-4 border-t border-cyan-500/15 p-4">
        {xpData && (
          <div className="space-y-2">
            <XPBar
              totalXp={xpData.total_xp}
              level={xpData.level}
              currentLevelMin={xpData.current_level_min}
              nextLevelMin={xpData.next_level_min}
              compact
            />
            <div className="flex justify-center">
              <StreakBadge streak={streak} size="sm" />
            </div>
          </div>
        )}
        {progressSummary && (
          <ProgressSummary
            missions={progressSummary.missions}
            completedCount={progressSummary.completedCount}
            totalScore={progressSummary.totalScore}
            tokens={progressSummary.tokens}
          />
        )}
        <TokenBadgeClient tokens={tokens} />
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "ring-2 ring-cyan-500/40",
              },
            }}
          />
          <p className="text-xs text-muted-foreground">Cadet Profile</p>
        </div>
      </div>
    </aside>
  );
}
