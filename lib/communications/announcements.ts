import "server-only";

import OpenAI from "openai";

import { sendCustomWhatsApp } from "@/lib/communications/whatsapp";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type AnnouncementRow = {
  id: string;
  trainer_id: string | null;
  cohort_id: string | null;
  title: string;
  message: string;
  send_whatsapp: boolean;
  send_notification: boolean;
  scheduled_at: string;
  sent: boolean;
  sent_at: string | null;
  reach_count: number;
  created_at: string;
};

export async function listAnnouncements(
  cohortId?: string | null
): Promise<AnnouncementRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  let query = admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (cohortId) {
    query = query.eq("cohort_id", cohortId);
  }

  const { data } = await query;
  return (data ?? []) as AnnouncementRow[];
}

export async function draftAnnouncementWithAI(
  topic: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `📢 Announcement: ${topic}\n\nDear cadets, please note the update regarding ${topic}. See you in class!`;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Draft a professional, friendly announcement for a robotics academy cohort. Keep it concise (2-4 sentences). Use emojis sparingly.",
      },
      { role: "user", content: topic },
    ],
    max_tokens: 300,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    `Announcement about ${topic}`
  );
}

export async function createAndSendAnnouncement(input: {
  trainerId: string;
  cohortId?: string | null;
  studentIds?: string[];
  title: string;
  message: string;
  sendWhatsapp?: boolean;
  sendNotification?: boolean;
  scheduledAt?: string | null;
}): Promise<{ ok: true; reach: number; announcementId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const admin = createSupabaseAdmin();
  const scheduledAt = input.scheduledAt ?? new Date().toISOString();
  const sendNow = new Date(scheduledAt) <= new Date();

  const { data: announcement, error } = await admin
    .from("announcements")
    .insert({
      trainer_id: input.trainerId,
      cohort_id: input.cohortId ?? null,
      title: input.title.trim(),
      message: input.message.trim(),
      send_whatsapp: input.sendWhatsapp ?? false,
      send_notification: input.sendNotification ?? true,
      scheduled_at: scheduledAt,
      sent: false,
    })
    .select("id")
    .single();

  if (error || !announcement) {
    return { ok: false, error: error?.message ?? "Failed to create" };
  }

  if (!sendNow) {
    return { ok: true, reach: 0, announcementId: announcement.id };
  }

  const reach = await deliverAnnouncement(announcement.id, input);
  return { ok: true, reach, announcementId: announcement.id };
}

async function deliverAnnouncement(
  announcementId: string,
  input: {
    cohortId?: string | null;
    studentIds?: string[];
    title: string;
    message: string;
    sendWhatsapp?: boolean;
    sendNotification?: boolean;
  }
): Promise<number> {
  const admin = createSupabaseAdmin();

  let studentIds = input.studentIds ?? [];

  if (studentIds.length === 0) {
    let query = admin.from("users").select("id").eq("role", "student");
    if (input.cohortId) {
      query = query.eq("cohort_id", input.cohortId);
    }
    const { data } = await query;
    studentIds = (data ?? []).map((s) => s.id);
  }

  let reach = 0;

  for (const studentId of studentIds) {
    if (input.sendNotification !== false) {
      await admin.from("notifications").insert({
        student_id: studentId,
        type: "trainer_message",
        title: input.title,
        message: input.message,
      });
      reach++;
    }

    if (input.sendWhatsapp) {
      const fullMessage = `📢 *${input.title}*\n\n${input.message}`;
      await sendCustomWhatsApp(studentId, fullMessage);
    }
  }

  await admin
    .from("announcements")
    .update({
      sent: true,
      sent_at: new Date().toISOString(),
      reach_count: reach,
    })
    .eq("id", announcementId);

  return reach;
}

export async function listAllAnnouncements(): Promise<AnnouncementRow[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as AnnouncementRow[];
}
