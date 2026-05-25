import { auth } from "@clerk/nextjs/server";

import {
  sendCertificateNotification,
  sendCustomWhatsApp,
  sendLoginReminder,
  sendModuleCompleteNotification,
  sendWeeklyProgressReport,
} from "@/lib/communications/whatsapp";
import {
  fetchParentContacts,
} from "@/lib/communications/parent-contacts";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";

type WhatsAppRequest = {
  type:
    | "module_complete"
    | "weekly_report"
    | "reminder"
    | "certificate"
    | "custom";
  student_id: string;
  payload?: {
    module_title?: string;
    score?: number;
    badge_name?: string;
    custom_message?: string;
  };
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: WhatsAppRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.student_id) {
    return Response.json({ error: "student_id required" }, { status: 400 });
  }

  const contacts = await fetchParentContacts(body.student_id);
  if (contacts.length === 0) {
    return Response.json(
      { error: "No parent contacts configured for this student" },
      { status: 400 }
    );
  }

  switch (body.type) {
    case "module_complete": {
      const result = await sendModuleCompleteNotification(
        body.student_id,
        body.payload?.module_title ?? "Mission",
        body.payload?.score ?? 0,
        body.payload?.badge_name ?? "Badge"
      );
      return Response.json(result);
    }
    case "weekly_report": {
      const result = await sendWeeklyProgressReport(body.student_id);
      return Response.json(result);
    }
    case "reminder": {
      const result = await sendLoginReminder(body.student_id);
      return Response.json(result);
    }
    case "certificate": {
      const result = await sendCertificateNotification(body.student_id);
      return Response.json(result);
    }
    case "custom": {
      if (!body.payload?.custom_message) {
        return Response.json({ error: "custom_message required" }, { status: 400 });
      }
      const result = await sendCustomWhatsApp(
        body.student_id,
        body.payload.custom_message
      );
      return Response.json(result);
    }
    default:
      return Response.json({ error: "Invalid type" }, { status: 400 });
  }
}
