import { sendMarketingBroadcast } from "@/lib/communications/whatsapp";
import { requireAdminContext } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { content_id?: string; contacts?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content_id || !body.contacts?.length) {
    return Response.json(
      { error: "content_id and contacts are required" },
      { status: 400 }
    );
  }

  const result = await sendMarketingBroadcast(body.content_id, body.contacts);

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdmin();
    await admin.from("marketing_content").update({
      performance_notes: `Broadcast ${new Date().toLocaleString()}: sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`,
    }).eq("id", body.content_id);
  }

  return Response.json(result);
}

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ items: [] });
  }

  const admin = createSupabaseAdmin();
  const { data: content } = await admin
    .from("marketing_content")
    .select("id, title, content_type, platform, status, created_at")
    .in("content_type", ["whatsapp", "announcement", "social_post"])
    .order("created_at", { ascending: false })
    .limit(50);

  return Response.json({ items: content ?? [] });
}
