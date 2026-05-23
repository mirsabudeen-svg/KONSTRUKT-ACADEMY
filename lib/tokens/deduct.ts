import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const DEFAULT_TOKENS = 10;

export type TokenDeductionResult =
  | { ok: true; remaining: number }
  | { ok: false; remaining: number; reason: "depleted" | "not_found" | "unconfigured" };

/**
 * Atomically deduct one AI token. Uses optimistic locking on tokens_remaining.
 */
export async function deductAiToken(
  userId: string,
  retry = true
): Promise<TokenDeductionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, remaining: 0, reason: "unconfigured" };
  }

  const admin = createSupabaseAdmin();

  const { data: user, error: fetchError } = await admin
    .from("users")
    .select("tokens_remaining")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !user) {
    return { ok: false, remaining: 0, reason: "not_found" };
  }

  if (user.tokens_remaining <= 0) {
    return { ok: false, remaining: 0, reason: "depleted" };
  }

  const nextBalance = user.tokens_remaining - 1;

  const { data: updated, error: updateError } = await admin
    .from("users")
    .update({ tokens_remaining: nextBalance })
    .eq("id", userId)
    .eq("tokens_remaining", user.tokens_remaining)
    .select("tokens_remaining")
    .maybeSingle();

  if (updateError || !updated) {
    if (retry) return deductAiToken(userId, false);
    return { ok: false, remaining: user.tokens_remaining, reason: "depleted" };
  }

  return { ok: true, remaining: updated.tokens_remaining };
}

export async function getTokenBalance(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return DEFAULT_TOKENS;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("tokens_remaining")
    .eq("id", userId)
    .maybeSingle();

  return data?.tokens_remaining ?? 0;
}
