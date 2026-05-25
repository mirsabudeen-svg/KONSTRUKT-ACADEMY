import { requireAdminContext } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { MAIA_TEMPLATES } from "@/lib/maia/templates";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({
      contentThisMonth: 0,
      broadcastsSent: 0,
      enquiries: [],
      contentByType: [],
      monthlyVolume: [],
      conversionRate: 0,
      topTemplates: [],
    });
  }

  const admin = createSupabaseAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { count: contentCount },
    { count: broadcastCount },
    { data: enquiries },
    { data: allContent },
  ] = await Promise.all([
    admin
      .from("marketing_content")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    admin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("message_type", "marketing_broadcast"),
    admin
      .from("marketing_enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("marketing_content").select("content_type, created_at"),
  ]);

  const typeCounts = new Map<string, number>();
  for (const item of allContent ?? []) {
    typeCounts.set(item.content_type, (typeCounts.get(item.content_type) ?? 0) + 1);
  }

  const contentByType = [...typeCounts.entries()].map(([type, count]) => ({
    type,
    count,
  }));

  const monthlyVolume: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const count = (allContent ?? []).filter((c) =>
      c.created_at.startsWith(key)
    ).length;
    monthlyVolume.push({ month: key, count });
  }

  const enquiryList = enquiries ?? [];
  const converted = enquiryList.filter((e) => e.converted).length;
  const conversionRate =
    enquiryList.length > 0 ? Math.round((converted / enquiryList.length) * 100) : 0;

  const sourceCounts = new Map<string, number>();
  for (const e of enquiryList) {
    const src = e.source ?? "unknown";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }

  const enquiriesBySource = [...sourceCounts.entries()].map(([source, count]) => ({
    source,
    count,
  }));

  const topTemplates = Object.entries(MAIA_TEMPLATES)
    .slice(0, 5)
    .map(([key, t]) => ({ key, label: t.label, platform: t.platform }));

  return Response.json({
    contentThisMonth: contentCount ?? 0,
    broadcastsSent: broadcastCount ?? 0,
    enquiries: enquiryList,
    contentByType,
    monthlyVolume,
    conversionRate,
    enquiriesBySource,
    topTemplates,
  });
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: {
    source?: string;
    contact_name?: string;
    notes?: string;
    converted?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("marketing_enquiries")
    .insert({
      admin_id: ctx.userId,
      source: body.source,
      contact_name: body.contact_name,
      notes: body.notes,
      converted: body.converted ?? false,
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ enquiry: data });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { id?: string; converted?: boolean; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const updates: Record<string, unknown> = {};
  if (body.converted !== undefined) updates.converted = body.converted;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data } = await admin
    .from("marketing_enquiries")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();

  return Response.json({ enquiry: data });
}
