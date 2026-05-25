import { fetchAdminDashboard } from "@/lib/admin/dashboard";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const data = await fetchAdminDashboard();
  return Response.json(data);
}
