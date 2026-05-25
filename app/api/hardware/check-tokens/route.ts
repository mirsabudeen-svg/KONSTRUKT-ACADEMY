import { auth } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getTokenBalance } from "@/lib/tokens/deduct";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const balance = await getTokenBalance(userId);

  if (!isSupabaseConfigured()) {
    return Response.json({ balance, history: [] });
  }

  const admin = createSupabaseAdmin();
  const { data: history } = await admin
    .from("token_usage_log")
    .select("usage_type, tokens_used, module_id, created_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return Response.json({ balance, history: history ?? [] });
}
