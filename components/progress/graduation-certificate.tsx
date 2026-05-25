"use client";

import { BadgeCard } from "@/components/progress/badge-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MissionModule } from "@/lib/db/types";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { MAX_TOTAL_SCORE, getTotalScore } from "@/lib/progress/stats";

type GraduationCertificateProps = {
  studentName: string;
  missions: MissionModule[];
  completionDate: string;
};

export function GraduationCertificate({
  studentName,
  missions,
  completionDate,
}: GraduationCertificateProps) {
  const totalScore = getTotalScore(missions);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="certificate-print rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/30 p-8 md:p-12 print:border-black print:bg-white print:text-black">
        <div className="text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-cyan-400 print:text-black">
            {APP_NAME}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground print:text-gray-600">
            {APP_TAGLINE}
          </p>

          <div className="mx-auto my-8 h-px w-32 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent print:via-gray-400" />

          <p className="text-sm uppercase tracking-widest text-muted-foreground print:text-gray-600">
            This certifies that
          </p>
          <h1 className="font-display mt-4 text-3xl font-bold text-foreground md:text-4xl print:text-black">
            {studentName}
          </h1>

          <p className="mt-8 text-lg text-muted-foreground print:text-gray-700">
            has successfully completed all 10 missions and is hereby awarded the title of
          </p>
          <h2 className="font-display mt-4 text-2xl font-bold tracking-wide text-cyan-300 md:text-3xl print:text-black">
            Certified KONTRAKTOR
          </h2>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground print:text-gray-600">
            <span>Completion Date: {completionDate}</span>
            <span>·</span>
            <span>
              Total Score: {totalScore}/{MAX_TOTAL_SCORE}
            </span>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5">
            {missions.map((m) => (
              <div key={m.id} className="scale-75 print:scale-100">
                <BadgeCard
                  badge_name={m.badge_name}
                  module_title={m.title}
                  module_id={m.id}
                  earned
                  score={m.progress?.score}
                  earned_at={m.progress?.updated_at}
                />
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center gap-16 border-t border-cyan-500/20 pt-8 print:border-gray-300">
            <div className="text-center">
              <div className="mx-auto h-px w-32 bg-cyan-500/30 print:bg-gray-400" />
              <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                Academy Director
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-px w-32 bg-cyan-500/30 print:bg-gray-400" />
              <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                Lead Trainer
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          )}
        >
          Download as PDF
        </button>
      </div>
    </div>
  );
}
