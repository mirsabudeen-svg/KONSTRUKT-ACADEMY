import { requireAdminContext } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ items: [] });
  }

  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("content_type");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const platform = searchParams.get("platform");

  const admin = createSupabaseAdmin();
  let query = admin.from("marketing_content").select("*").order("created_at", {
    ascending: false,
  });

  if (contentType && contentType !== "all") {
    query = query.eq("content_type", contentType);
  }
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (platform && platform !== "all") {
    query = query.eq("platform", platform);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data } = await query.limit(100);
  return Response.json({ items: data ?? [] });
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
    content_type?: string;
    platform?: string;
    title?: string;
    content?: string;
    tone?: string;
    target_audience?: string;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content_type || !body.content) {
    return Response.json(
      { error: "content_type and content are required" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("marketing_content")
    .insert({
      admin_id: ctx.userId,
      content_type: body.content_type,
      platform: body.platform,
      title: body.title,
      content: body.content,
      tone: body.tone ?? "professional",
      target_audience: body.target_audience,
      status: body.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ item: data });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: {
    id?: string;
    title?: string;
    content?: string;
    status?: string;
    performance_notes?: string;
    platform?: string;
    tone?: string;
    target_audience?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.status !== undefined) updates.status = body.status;
  if (body.performance_notes !== undefined) updates.performance_notes = body.performance_notes;
  if (body.platform !== undefined) updates.platform = body.platform;
  if (body.tone !== undefined) updates.tone = body.tone;
  if (body.target_audience !== undefined) updates.target_audience = body.target_audience;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("marketing_content")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ item: data });
}

export async function DELETE(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("marketing_content").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
