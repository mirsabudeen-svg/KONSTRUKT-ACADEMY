import { auth } from "@clerk/nextjs/server";

import { requireAdminContext } from "@/lib/auth/admin";
import { testContentFilter } from "@/lib/safety/content-monitor";
import {
  fetchContentFilters,
  fetchSafetyFlags,
  flagsToCsv,
} from "@/lib/safety/queries";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("export") === "csv") {
    const flags = await fetchSafetyFlags();
    const csv = flagsToCsv(flags);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=safety-audit.csv",
      },
    });
  }

  const filters = await fetchContentFilters();
  return Response.json({ filters });
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    filter_type?: string;
    value?: string;
    test_value?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.test_value) {
    const blocked = await testContentFilter(body.test_value);
    return Response.json({ blocked, test_value: body.test_value });
  }

  if (!body.filter_type || !body.value?.trim()) {
    return Response.json(
      { error: "filter_type and value required" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("content_filters")
    .insert({
      filter_type: body.filter_type,
      value: body.value.trim(),
      created_by: ctx.userId,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ filter: data });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { id?: string; active?: boolean; resolved?: boolean; flag_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdmin();

  if (body.flag_id) {
    const { error } = await admin
      .from("safety_flags")
      .update({
        reviewed: true,
        resolved: body.resolved ?? true,
        reviewed_by: ctx.userId,
      })
      .eq("id", body.flag_id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  if (!body.id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await admin
    .from("content_filters")
    .update({ active: body.active })
    .eq("id", body.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
