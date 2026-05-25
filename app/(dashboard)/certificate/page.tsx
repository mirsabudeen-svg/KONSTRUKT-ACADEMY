import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { GraduationCertificateLazy } from "@/components/progress/graduation-certificate-lazy";
import { getMissionTrack } from "@/lib/progress/missions";
import { getCompletedCount, MODULE_COUNT } from "@/lib/progress/stats";

export default async function CertificatePage() {
  const user = await currentUser();
  const { missions } = await getMissionTrack();
  const completed = getCompletedCount(missions);

  if (completed < MODULE_COUNT) {
    redirect("/dashboard");
  }

  const studentName =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    "Cadet";

  const lastCompleted = missions
    .filter((m) => m.displayStatus === "completed" && m.progress?.updated_at)
    .sort(
      (a, b) =>
        new Date(b.progress!.updated_at).getTime() -
        new Date(a.progress!.updated_at).getTime()
    )[0];

  const completionDate = lastCompleted?.progress?.updated_at
    ? new Date(lastCompleted.progress.updated_at).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-cyan-500/80">
          Graduation
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          Your Certificate
        </h1>
        <p className="mt-2 text-muted-foreground">
          All {MODULE_COUNT} missions complete. You are a Certified Kontraktor.
        </p>
      </div>

      <GraduationCertificateLazy
        studentName={studentName}
        missions={missions}
        completionDate={completionDate}
      />
    </div>
  );
}
