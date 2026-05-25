import { auth } from "@clerk/nextjs/server";

import { createSafetyFlag } from "@/lib/safety/flags";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    report_type?: string;
    details?: string;
    message_content?: string;
    module_id?: number;
    conversation_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { report_type, details, message_content, module_id, conversation_id } =
    body;

  if (!report_type?.trim()) {
    return Response.json({ error: "report_type is required" }, { status: 400 });
  }

  await createSafetyFlag({
    studentId: userId,
    flagType: "student_report",
    severity: "low",
    source: "tutor_chat",
    contentSnippet: message_content ?? details ?? report_type,
    details: {
      report_type,
      details: details ?? "",
      module_id,
      conversation_id,
    },
  });

  return Response.json({
    success: true,
    message: "Thank you for your report. A trainer will review it soon.",
  });
}
