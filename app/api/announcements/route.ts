import { auth } from "@clerk/nextjs/server";

import {
  createAndSendAnnouncement,
  draftAnnouncementWithAI,
  listAnnouncements,
} from "@/lib/communications/announcements";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const announcements = await listAnnouncements(cohortId);
  return Response.json({ announcements });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    action?: "draft" | "send";
    topic?: string;
    title?: string;
    message?: string;
    cohort_id?: string | null;
    student_ids?: string[];
    send_whatsapp?: boolean;
    send_notification?: boolean;
    scheduled_at?: string | null;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "draft") {
    if (!body.topic?.trim()) {
      return Response.json({ error: "topic required" }, { status: 400 });
    }
    const draft = await draftAnnouncementWithAI(body.topic);
    return Response.json({ draft });
  }

  if (!body.title?.trim() || !body.message?.trim()) {
    return Response.json({ error: "title and message required" }, { status: 400 });
  }

  const result = await createAndSendAnnouncement({
    trainerId: userId,
    cohortId: body.cohort_id,
    studentIds: body.student_ids,
    title: body.title,
    message: body.message,
    sendWhatsapp: body.send_whatsapp,
    sendNotification: body.send_notification,
    scheduledAt: body.scheduled_at,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({
    ok: true,
    reach: result.reach,
    announcement_id: result.announcementId,
  });
}
