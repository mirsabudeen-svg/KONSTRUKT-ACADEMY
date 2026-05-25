import "server-only";

import {
  DEFAULT_PARENT_NOTIFICATION_PREFS,
  type ParentNotificationPrefs,
  type WhatsAppMessageType,
} from "@/lib/communications/types";
import {
  getAppUrl,
  getMessageTemplate,
  getStudentDisplayName,
  renderTemplate,
} from "@/lib/communications/utils";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const WHATSAPP_API_URL =
  process.env.WHATSAPP_API_URL ?? "https://graph.facebook.com/v18.0";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export type SendWhatsAppResult = {
  success: boolean;
  message_id?: string;
  reason?: string;
  log_id?: string;
};

function normalizePhoneNumber(number: string): string {
  return number.replace(/[\s\-()]/g, "");
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  meta?: {
    studentId?: string;
    parentContactId?: string;
    messageType?: WhatsAppMessageType;
  }
): Promise<SendWhatsAppResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, reason: "unconfigured" };
  }

  const admin = createSupabaseAdmin();
  const phone = normalizePhoneNumber(to);

  const { data: logRow } = await admin
    .from("whatsapp_messages")
    .insert({
      student_id: meta?.studentId ?? null,
      parent_contact_id: meta?.parentContactId ?? null,
      message_type: meta?.messageType ?? "custom",
      message_body: message,
      whatsapp_number: phone,
      status: "pending",
    })
    .select("id")
    .single();

  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log("[WhatsApp] Skipping — no credentials");
    if (logRow?.id) {
      await admin
        .from("whatsapp_messages")
        .update({ status: "skipped" })
        .eq("id", logRow.id);
    }
    return {
      success: false,
      reason: "no_credentials",
      log_id: logRow?.id,
    };
  }

  try {
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/^\+/, ""),
        type: "text",
        text: { body: message },
      }),
    });

    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message: string };
    };

    if (!res.ok) {
      await admin
        .from("whatsapp_messages")
        .update({ status: "failed" })
        .eq("id", logRow!.id);
      return {
        success: false,
        reason: json.error?.message ?? "api_error",
        log_id: logRow?.id,
      };
    }

    const messageId = json.messages?.[0]?.id;
    await admin
      .from("whatsapp_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_message_id: messageId ?? null,
      })
      .eq("id", logRow!.id);

    return { success: true, message_id: messageId, log_id: logRow?.id };
  } catch (err) {
    console.error("[sendWhatsAppMessage]", err);
    if (logRow?.id) {
      await admin
        .from("whatsapp_messages")
        .update({ status: "failed" })
        .eq("id", logRow.id);
    }
    return { success: false, reason: "network_error", log_id: logRow?.id };
  }
}

async function getStudentNotificationPrefs(
  studentId: string
): Promise<ParentNotificationPrefs> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("parent_notification_prefs")
    .eq("id", studentId)
    .maybeSingle();

  return {
    ...DEFAULT_PARENT_NOTIFICATION_PREFS,
    ...((data?.parent_notification_prefs as ParentNotificationPrefs) ?? {}),
  };
}

async function getEnabledParentContacts(studentId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("parent_contacts")
    .select("*")
    .eq("student_id", studentId)
    .eq("notifications_enabled", true);

  return data ?? [];
}

function portalLink(token: string): string {
  return `${getAppUrl()}/parent/${token}`;
}

export async function sendModuleCompleteNotification(
  studentId: string,
  moduleTitle: string,
  score: number,
  badgeName: string
): Promise<{ sent: number; failed: number }> {
  const prefs = await getStudentNotificationPrefs(studentId);
  if (!prefs.module_completions) return { sent: 0, failed: 0 };

  const contacts = await getEnabledParentContacts(studentId);
  if (contacts.length === 0) return { sent: 0, failed: 0 };

  const studentName = await getStudentDisplayName(studentId);
  const template =
    (await getMessageTemplate("module_complete")) ??
    `🎉 Great news! {{student_name}} completed *{{module_title}}*!\nScore: {{score}}/100\nBadge: {{badge_name}}\n{{portal_link}}`;

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const message = renderTemplate(template, {
      student_name: studentName,
      module_title: moduleTitle,
      score: score,
      badge_name: badgeName,
      portal_link: portalLink(contact.portal_token),
    });

    const result = await sendWhatsAppMessage(
      contact.whatsapp_number,
      message,
      {
        studentId,
        parentContactId: contact.id,
        messageType: "module_completed",
      }
    );
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendWeeklyProgressReport(
  studentId: string
): Promise<{ sent: number; failed: number }> {
  const prefs = await getStudentNotificationPrefs(studentId);
  if (!prefs.weekly_reports) return { sent: 0, failed: 0 };

  const contacts = await getEnabledParentContacts(studentId);
  if (contacts.length === 0) return { sent: 0, failed: 0 };

  const admin = createSupabaseAdmin();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const { data: user } = await admin
    .from("users")
    .select("total_xp, current_streak")
    .eq("id", studentId)
    .maybeSingle();

  const { data: weekXp } = await admin
    .from("xp_events")
    .select("xp_earned")
    .eq("student_id", studentId)
    .gte("created_at", weekStart.toISOString());

  const { data: progress } = await admin
    .from("progress")
    .select("module_id, status, updated_at")
    .eq("student_id", studentId);

  const completedThisWeek = (progress ?? []).filter(
    (p) =>
      p.status === "completed" &&
      new Date(p.updated_at) >= weekStart
  ).length;

  const totalCompleted = (progress ?? []).filter(
    (p) => p.status === "completed"
  ).length;

  const xpEarned = (weekXp ?? []).reduce(
    (sum, e) => sum + (e.xp_earned ?? 0),
    0
  );

  const inProgress = (progress ?? []).find(
    (p) => p.status === "in_progress" || p.status === "ready"
  );

  let nextMission = "Keep going!";
  if (inProgress?.module_id) {
    const { data: mod } = await admin
      .from("modules")
      .select("title")
      .eq("id", inProgress.module_id)
      .maybeSingle();
    nextMission = mod?.title ?? `Module ${inProgress.module_id}`;
  }

  const studentName = await getStudentDisplayName(studentId);
  const dateRange = `${weekStart.toLocaleDateString()} – ${new Date().toLocaleDateString()}`;

  const template =
    (await getMessageTemplate("weekly_progress")) ??
    "Weekly report for {{student_name}}: {{modules_completed}} modules, {{xp_earned}} XP";

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const message = renderTemplate(template, {
      student_name: studentName,
      date_range: dateRange,
      modules_completed: completedThisWeek,
      xp_earned: xpEarned,
      streak: user?.current_streak ?? 0,
      badges: completedThisWeek > 0 ? `${completedThisWeek} new` : "None",
      progress: totalCompleted,
      next_mission: nextMission,
    });

    const result = await sendWhatsAppMessage(
      contact.whatsapp_number,
      message,
      {
        studentId,
        parentContactId: contact.id,
        messageType: "weekly_progress",
      }
    );
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendLoginReminder(
  studentId: string
): Promise<{ sent: number; failed: number }> {
  const prefs = await getStudentNotificationPrefs(studentId);
  if (!prefs.login_reminders) return { sent: 0, failed: 0 };

  const contacts = await getEnabledParentContacts(studentId);
  if (contacts.length === 0) return { sent: 0, failed: 0 };

  const admin = createSupabaseAdmin();
  const { data: user } = await admin
    .from("users")
    .select("last_login_date")
    .eq("id", studentId)
    .maybeSingle();

  let inactiveDays = 3;
  if (user?.last_login_date) {
    inactiveDays = Math.floor(
      (Date.now() - new Date(user.last_login_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  if (inactiveDays < 3) return { sent: 0, failed: 0 };

  const { data: progress } = await admin
    .from("progress")
    .select("status")
    .eq("student_id", studentId)
    .eq("status", "completed");

  const studentName = await getStudentDisplayName(studentId);
  const template =
    (await getMessageTemplate("login_reminder")) ??
    "Hi {{parent_name}}, {{student_name}} hasn't logged in for {{inactive_days}} days.";

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const message = renderTemplate(template, {
      parent_name: contact.parent_name,
      student_name: studentName,
      inactive_days: inactiveDays,
      progress: progress?.length ?? 0,
      app_url: getAppUrl(),
    });

    const result = await sendWhatsAppMessage(
      contact.whatsapp_number,
      message,
      {
        studentId,
        parentContactId: contact.id,
        messageType: "login_reminder",
      }
    );
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendCertificateNotification(
  studentId: string
): Promise<{ sent: number; failed: number }> {
  const prefs = await getStudentNotificationPrefs(studentId);
  if (!prefs.module_completions) return { sent: 0, failed: 0 };

  const contacts = await getEnabledParentContacts(studentId);
  if (contacts.length === 0) return { sent: 0, failed: 0 };

  const admin = createSupabaseAdmin();
  const { data: user } = await admin
    .from("users")
    .select("total_xp")
    .eq("id", studentId)
    .maybeSingle();

  const { data: progress } = await admin
    .from("progress")
    .select("score")
    .eq("student_id", studentId)
    .eq("status", "completed");

  const totalScore = (progress ?? []).reduce(
    (sum, p) => sum + (p.score ?? 0),
    0
  );

  const studentName = await getStudentDisplayName(studentId);
  const template =
    (await getMessageTemplate("certificate")) ??
    "🎓 {{student_name}} is now a Certified KONTRAKTOR!";

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const message = renderTemplate(template, {
      student_name: studentName,
      total_score: totalScore,
      total_xp: user?.total_xp ?? 0,
      certificate_link: `${getAppUrl()}/certificate`,
    });

    const result = await sendWhatsAppMessage(
      contact.whatsapp_number,
      message,
      {
        studentId,
        parentContactId: contact.id,
        messageType: "certificate",
      }
    );
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendWeeklyReportsToAll(
  cohortId?: string | null
): Promise<{ sent: number; failed: number; students: number }> {
  const admin = createSupabaseAdmin();
  let query = admin.from("users").select("id").eq("role", "student");

  if (cohortId) {
    query = query.eq("cohort_id", cohortId);
  }

  const { data: students } = await query;
  let sent = 0;
  let failed = 0;

  for (const student of students ?? []) {
    const result = await sendWeeklyProgressReport(student.id);
    sent += result.sent;
    failed += result.failed;
  }

  return { sent, failed, students: students?.length ?? 0 };
}

export async function retryFailedWhatsAppMessages(): Promise<{
  retried: number;
  succeeded: number;
}> {
  const admin = createSupabaseAdmin();
  const { data: failed } = await admin
    .from("whatsapp_messages")
    .select("id, whatsapp_number, message_body, student_id, parent_contact_id, message_type")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(50);

  let retried = 0;
  let succeeded = 0;

  for (const msg of failed ?? []) {
    retried++;
    const result = await sendWhatsAppMessage(
      msg.whatsapp_number,
      msg.message_body,
      {
        studentId: msg.student_id ?? undefined,
        parentContactId: msg.parent_contact_id ?? undefined,
        messageType: msg.message_type as WhatsAppMessageType,
      }
    );
    if (result.success) succeeded++;
  }

  return { retried, succeeded };
}

export async function sendCustomWhatsApp(
  studentId: string,
  customMessage: string
): Promise<{ sent: number; failed: number }> {
  const contacts = await getEnabledParentContacts(studentId);
  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const result = await sendWhatsAppMessage(
      contact.whatsapp_number,
      customMessage,
      {
        studentId,
        parentContactId: contact.id,
        messageType: "custom",
      }
    );
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendTestWhatsApp(
  phoneNumber: string,
  message?: string
): Promise<SendWhatsAppResult> {
  return sendWhatsAppMessage(
    phoneNumber,
    message ??
      "✅ KONSTRUKT Academy — WhatsApp integration test message. Your notifications are configured correctly!",
    { messageType: "test" }
  );
}

export type MarketingBroadcastResult = {
  sent: number;
  failed: number;
  skipped: number;
  results: { phone: string; success: boolean; reason?: string }[];
};

/** MAIA-powered marketing broadcast — not sent to enrolled students' parent contacts. */
export async function sendMarketingBroadcast(
  contentId: string,
  contactList: string[]
): Promise<MarketingBroadcastResult> {
  if (!isSupabaseConfigured()) {
    return { sent: 0, failed: 0, skipped: 0, results: [] };
  }

  const admin = createSupabaseAdmin();

  const { data: content } = await admin
    .from("marketing_content")
    .select("content, title")
    .eq("id", contentId)
    .maybeSingle();

  if (!content) {
    return {
      sent: 0,
      failed: contactList.length,
      skipped: 0,
      results: contactList.map((phone) => ({
        phone,
        success: false,
        reason: "content_not_found",
      })),
    };
  }

  const { data: parentNumbers } = await admin
    .from("parent_contacts")
    .select("whatsapp_number");

  const studentNumbers = new Set(
    (parentNumbers ?? []).map((p) => normalizePhoneNumber(p.whatsapp_number))
  );

  const message = content.content;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results: MarketingBroadcastResult["results"] = [];

  for (const raw of contactList) {
    const phone = normalizePhoneNumber(raw.trim());
    if (!phone) continue;

    if (studentNumbers.has(phone)) {
      skipped++;
      results.push({ phone, success: false, reason: "existing_student_contact" });
      continue;
    }

    const result = await sendWhatsAppMessage(phone, message, {
      messageType: "marketing_broadcast" as WhatsAppMessageType,
    });

    if (result.success) sent++;
    else failed++;
    results.push({
      phone,
      success: result.success,
      reason: result.reason,
    });
  }

  return { sent, failed, skipped, results };
}
