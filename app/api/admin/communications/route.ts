import { auth } from "@clerk/nextjs/server";

import {
  fetchCommunicationHub,
  updateMessageTemplate,
} from "@/lib/communications/hub";
import {
  retryFailedWhatsAppMessages,
  sendWeeklyReportsToAll,
} from "@/lib/communications/whatsapp";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const data = await fetchCommunicationHub();
  return Response.json(data);
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    action?: "weekly_reports" | "retry_failed" | "update_template";
    cohort_id?: string | null;
    template_id?: string;
    body_template?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "weekly_reports") {
    const result = await sendWeeklyReportsToAll(body.cohort_id ?? null);
    return Response.json(result);
  }

  if (body.action === "retry_failed") {
    const result = await retryFailedWhatsAppMessages();
    return Response.json(result);
  }

  if (body.action === "update_template" && body.template_id && body.body_template) {
    const result = await updateMessageTemplate(
      body.template_id,
      body.body_template
    );
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
