import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ChallengesList } from "@/components/gamification/challenges-list";
import { getChallengesForStudent } from "@/lib/gamification/challenges";

export default async function StudentChallengesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const challenges = await getChallengesForStudent(userId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-500/80">
          Bonus Missions
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Challenges</h1>
        <p className="mt-2 text-muted-foreground">
          Accept trainer challenges for extra XP and bragging rights.
        </p>
      </div>
      <ChallengesList challenges={challenges} />
    </div>
  );
}
