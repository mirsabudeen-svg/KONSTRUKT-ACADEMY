import { auth } from "@clerk/nextjs/server";

import { simulateCode } from "@/lib/hardware/code-simulator";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string; module_id?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  const moduleId = body.module_id;

  if (!code) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }

  if (
    moduleId != null &&
    (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10)
  ) {
    return Response.json({ error: "Invalid module_id" }, { status: 400 });
  }

  const result = simulateCode(code);

  if (isSupabaseConfigured() && moduleId) {
    try {
      const admin = createSupabaseAdmin();
      await admin.from("code_simulations").insert({
        student_id: userId,
        module_id: moduleId,
        code,
        simulation_result: result,
      });
    } catch (err) {
      console.error("[simulate] persist failed", err);
    }
  }

  return Response.json({ result });
}
