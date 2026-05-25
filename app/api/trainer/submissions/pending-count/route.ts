import { fetchPendingSubmissionCount } from "@/lib/trainer/submissions";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";

export async function GET() {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const count = await fetchPendingSubmissionCount();
  return Response.json({ count });
}
