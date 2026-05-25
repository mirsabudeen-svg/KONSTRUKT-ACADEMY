import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LeaderboardClient } from "@/components/gamification/leaderboard-client";
import {
  getCohortLeaderboard,
  type LeaderboardPeriod,
} from "@/lib/gamification/leaderboard";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const period: LeaderboardPeriod =
    params.period === "week" ? "week" : "all_time";

  const { entries } = await getCohortLeaderboard(userId, period);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-500/80">
          Cohort Rankings
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          Cohort Leaderboard 🏆
        </h1>
        <p className="mt-2 text-muted-foreground">
          Compete with your batchmates — earn XP by completing missions and
          challenges.
        </p>
      </div>

      <LeaderboardClient
        entries={entries}
        currentUserId={userId}
        period={period}
      />
    </div>
  );
}
