import { AppSidebar } from "@/components/app-sidebar";
import { ProactiveHintChecker } from "@/components/ai/proactive-hint-checker";
import { LayoutErrorBoundary } from "@/components/error/error-boundary";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { SessionMonitor } from "@/components/safety/session-monitor";
import { LoginXpTracker, XPEventListener } from "@/components/gamification/login-xp-tracker";
import { XPToastProvider } from "@/components/gamification/xp-toast";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";
import { getActiveChallengeCount } from "@/lib/gamification/challenges";
import { getStreak } from "@/lib/gamification/streak-engine";
import { getStudentXP } from "@/lib/gamification/xp-engine";
import { getMissionTrack } from "@/lib/progress/missions";
import {
  getCompletedCount,
  getTotalScore,
} from "@/lib/progress/stats";
import { fetchPendingSubmissionCount } from "@/lib/trainer/submissions";
import { getTokensRemaining } from "@/lib/tokens";
import { auth } from "@clerk/nextjs/server";

export async function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const tokens = await getTokensRemaining();
  const { userId } = await auth();
  const role = userId ? await getUserRoleById(userId) : null;
  const isTrainer = isTrainerOrAdminRole(role);
  const pendingSubmissions = isTrainer ? await fetchPendingSubmissionCount() : 0;
  const track = await getMissionTrack();
  const completedCount = getCompletedCount(track.missions);
  const totalScore = getTotalScore(track.missions);

  const xpData = userId ? await getStudentXP(userId) : null;
  const streakData = userId ? await getStreak(userId) : null;

  const sidebar = (
    <AppSidebar
      tokens={tokens}
      isTrainer={isTrainer}
      pendingSubmissions={pendingSubmissions}
      progressSummary={{
        missions: track.missions,
        completedCount,
        totalScore,
        tokens,
      }}
      xpData={xpData}
      streak={streakData?.current_streak ?? 0}
    />
  );

  return (
    <LayoutErrorBoundary>
      <ToastProvider>
        <XPToastProvider>
          <div className="relative flex min-h-screen bg-background">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-background to-background" />

            <DashboardShellClient
              sidebar={sidebar}
              header={<NotificationBell />}
            >
              <LoginXpTracker />
              <XPEventListener />
              <ProactiveHintChecker />
              <SessionMonitor />
              {(title || subtitle) && (
                <header className="mb-6 border-b border-cyan-500/10 pb-6">
                  {title && (
                    <h1 className="font-display text-2xl font-bold tracking-wide text-foreground">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subtitle}
                    </p>
                  )}
                </header>
              )}
              {children}
            </DashboardShellClient>
          </div>
        </XPToastProvider>
      </ToastProvider>
    </LayoutErrorBoundary>
  );
}
