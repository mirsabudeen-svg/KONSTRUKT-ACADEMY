import {
  bulkRefillLowTokenStudents,
  fetchTokenAnalytics,
} from "@/lib/admin/tokens";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const data = await fetchTokenAnalytics();
  return Response.json(data);
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { action?: string; threshold?: number; amount?: number } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "bulk_refill") {
    const result = await bulkRefillLowTokenStudents(
      ctx.userId,
      body.threshold ?? 2,
      body.amount ?? 5
    );
    return Response.json(result);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
