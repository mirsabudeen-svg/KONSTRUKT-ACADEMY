import { ClipboardList } from "lucide-react";

import { SubmissionReviewBoard } from "@/components/trainer/submission-review-board";
import { Badge } from "@/components/ui/badge";
import { fetchTrainerSubmissions } from "@/lib/trainer/submissions";

export default async function TrainerSubmissionsPage() {
  const submissions = await fetchTrainerSubmissions("all");
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <ClipboardList className="size-6 text-violet-400" aria-hidden />
          <h1 className="font-display text-3xl font-bold">Submission Review</h1>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/20">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Review cadet mission submissions. Approving marks the mission complete
          and unlocks the next module automatically.
        </p>
      </div>

      <SubmissionReviewBoard initialSubmissions={submissions} />
    </div>
  );
}
