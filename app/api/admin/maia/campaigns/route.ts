import { requireAdminContext } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ campaigns: [] });
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  return Response.json({ campaigns: data ?? [] });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { id?: string; status?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return Response.json({ error: "id and status required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("marketing_campaigns")
    .update({ status: body.status })
    .eq("id", body.id)
    .select("*")
    .single();

  return Response.json({ campaign: data });
}
