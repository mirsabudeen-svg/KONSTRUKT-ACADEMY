import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CreateChallengeForm } from "@/components/trainer/create-challenge-form";
import {
  getModulesList,
  getTrainerCohortId,
} from "@/lib/gamification/challenges";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export default async function TrainerChallengesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) redirect("/dashboard");

  const cohortId = await getTrainerCohortId(userId);
  const modules = await getModulesList();

  let cohortName: string | undefined;
  if (cohortId) {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("cohorts")
      .select("name")
      .eq("id", cohortId)
      .maybeSingle();
    cohortName = data?.name;
  }

  const { data: existing } = cohortId
    ? await createSupabaseAdmin()
        .from("challenges")
        .select("id, title, xp_reward, deadline, created_at")
        .eq("cohort_id", cohortId)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-400/80">
          Gamification
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          Challenge Manager
        </h1>
        <p className="mt-2 text-muted-foreground">
          Create bonus challenges for your cohort to boost engagement.
        </p>
      </div>

      <CreateChallengeForm
        modules={modules}
        cohortId={cohortId}
        cohortName={cohortName}
      />

      {(existing ?? []).length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-lg font-semibold">
            Recent Challenges
          </h2>
          <div className="space-y-2">
            {(existing ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-violet-500/15 bg-zinc-950/50 px-4 py-3"
              >
                <span className="font-medium">{c.title}</span>
                <span className="font-mono text-sm text-violet-300">
                  {c.xp_reward} XP
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
