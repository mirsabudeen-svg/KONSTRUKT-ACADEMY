import {
  fetchPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from "@/lib/admin/settings";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const settings = await fetchPlatformSettings();
  return Response.json({ settings });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: Partial<PlatformSettings> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await updatePlatformSettings(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const settings = await fetchPlatformSettings();
  return Response.json({ ok: true, settings });
}
