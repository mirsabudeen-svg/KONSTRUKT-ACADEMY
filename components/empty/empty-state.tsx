import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  FileX,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center"
      role="status"
    >
      <Icon className="size-10 text-muted-foreground/60" aria-hidden />
      <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && (onAction || actionHref) && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {actionLabel}
            </Link>
          ) : (
            <Button type="button" variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function NoSubmissions() {
  return (
    <EmptyState
      icon={FileX}
      title="No submissions yet"
      description="Students haven't submitted any work yet. Check back after missions are in progress."
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="You're all caught up!"
      description="No new notifications right now."
    />
  );
}

export function NoChallenges() {
  return (
    <EmptyState
      icon={Trophy}
      title="No active challenges"
      description="Your trainer hasn't created any challenges yet."
    />
  );
}

export function NoStudents() {
  return (
    <EmptyState
      icon={Users}
      title="No students in this cohort"
      description="Students will appear once they sign up and join a cohort."
    />
  );
}

export function NoAlerts() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="All students on track ✅"
      description="No alerts at this time. Great work keeping everyone moving!"
    />
  );
}

export function NoBadges() {
  return (
    <EmptyState
      icon={Award}
      title="No badges earned yet"
      description="Complete missions to earn badges and fill your collection."
      actionLabel="View Missions"
      actionHref="/missions"
    />
  );
}

export function NoSafetyFlags() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="No safety flags"
      description="All clear — no safety concerns reported."
    />
  );
}
