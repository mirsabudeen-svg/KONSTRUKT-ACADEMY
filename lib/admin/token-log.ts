import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type TokenUsageType =
  | "ai_terminal"
  | "meshy_3d"
  | "code_gen"
  | "tutor"
  | "assembly_guide"
  | "design_validation";

export async function logTokenUsage(input: {
  studentId: string;
  usageType: TokenUsageType;
  tokensUsed?: number;
  moduleId?: number | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createSupabaseAdmin();
    await admin.from("token_usage_log").insert({
      student_id: input.studentId,
      usage_type: input.usageType,
      tokens_used: input.tokensUsed ?? 1,
      module_id: input.moduleId ?? null,
    });
  } catch (err) {
    console.error("[logTokenUsage]", err);
  }
}

export async function logTokenRefill(input: {
  trainerId: string;
  studentId: string;
  amount: number;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createSupabaseAdmin();
    await admin.from("token_refill_log").insert({
      trainer_id: input.trainerId,
      student_id: input.studentId,
      amount: input.amount,
    });
  } catch (err) {
    console.error("[logTokenRefill]", err);
  }
}
