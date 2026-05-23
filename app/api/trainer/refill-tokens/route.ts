import {
  refillStudentTokens,
  requireTrainerContext,
  TOKEN_REFILL_AMOUNT,
} from "@/lib/supabase/trainer-actions";

export async function POST(req: Request) {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { studentId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { studentId } = body;
  if (!studentId) {
    return Response.json({ error: "studentId is required" }, { status: 400 });
  }

  const result = await refillStudentTokens(studentId, TOKEN_REFILL_AMOUNT);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    success: true,
    tokensRemaining: result.tokensRemaining,
    added: result.added,
  });
}
