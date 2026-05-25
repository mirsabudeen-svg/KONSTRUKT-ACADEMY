import { generateAdminReport, type ReportType } from "@/lib/admin/reports";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";

const VALID_TYPES: ReportType[] = [
  "student_progress",
  "trainer_activity",
  "token_economy",
  "cohort_performance",
  "ai_usage",
];

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    report_type?: string;
    date_range?: { start: string; end: string };
    cohort_id?: string | null;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.report_type || !VALID_TYPES.includes(body.report_type as ReportType)) {
    return Response.json({ error: "Invalid report_type" }, { status: 400 });
  }

  const result = await generateAdminReport({
    reportType: body.report_type as ReportType,
    dateRange: body.date_range,
    cohortId: body.cohort_id,
  });

  return Response.json(result);
}
