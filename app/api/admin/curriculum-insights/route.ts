import {
  computeCurriculumInsights,
  generateCurriculumReport,
} from "@/lib/admin/curriculum";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const data = await computeCurriculumInsights();
  return Response.json(data);
}

export async function POST() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const insights = await computeCurriculumInsights();
  const report = await generateCurriculumReport(insights.modules);
  return Response.json({ report, computedAt: insights.computedAt });
}
