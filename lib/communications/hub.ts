import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type CommunicationHubData = {
  whatsapp: {
    sentToday: number;
    sentThisWeek: number;
    sentThisMonth: number;
    deliveryRate: number;
    failedMessages: {
      id: string;
      messageType: string;
      whatsappNumber: string;
      createdAt: string;
      messageBody: string;
    }[];
  };
  weeklyReports: {
    lastSent: string | null;
    nextScheduled: string | null;
  };
  parentPortal: {
    activeLinks: number;
    viewsThisWeek: number;
  };
  templates: {
    id: string;
    title: string;
    bodyTemplate: string;
    updatedAt: string;
  }[];
  announcements: {
    id: string;
    title: string;
    sentAt: string | null;
    reachCount: number;
    cohortId: string | null;
  }[];
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function fetchCommunicationHub(): Promise<CommunicationHubData> {
  const empty: CommunicationHubData = {
    whatsapp: {
      sentToday: 0,
      sentThisWeek: 0,
      sentThisMonth: 0,
      deliveryRate: 0,
      failedMessages: [],
    },
    weeklyReports: { lastSent: null, nextScheduled: null },
    parentPortal: { activeLinks: 0, viewsThisWeek: 0 },
    templates: [],
    announcements: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = daysAgoIso(7);
  const monthAgo = daysAgoIso(30);

  const { data: allMessages } = await admin
    .from("whatsapp_messages")
    .select("status, created_at, sent_at")
    .gte("created_at", monthAgo);

  const msgs = allMessages ?? [];
  const sentToday = msgs.filter(
    (m) =>
      m.status === "sent" &&
      (m.sent_at ?? m.created_at).slice(0, 10) === today
  ).length;
  const sentThisWeek = msgs.filter(
    (m) => m.status === "sent" && (m.sent_at ?? m.created_at) >= weekAgo
  ).length;
  const sentThisMonth = msgs.filter((m) => m.status === "sent").length;
  const attempted = msgs.filter((m) =>
    ["sent", "failed", "delivered"].includes(m.status)
  ).length;
  const deliveryRate =
    attempted > 0 ? Math.round((sentThisMonth / attempted) * 100) : 0;

  const { data: failed } = await admin
    .from("whatsapp_messages")
    .select("id, message_type, whatsapp_number, created_at, message_body")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: lastWeekly } = await admin
    .from("whatsapp_messages")
    .select("sent_at, created_at")
    .eq("message_type", "weekly_progress")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: activeLinks } = await admin
    .from("parent_contacts")
    .select("id", { count: "exact", head: true });

  const { count: viewsThisWeek } = await admin
    .from("parent_portal_views")
    .select("id", { count: "exact", head: true })
    .gte("viewed_at", weekAgo);

  const { data: templates } = await admin
    .from("message_templates")
    .select("id, title, body_template, updated_at")
    .order("id");

  const { data: announcements } = await admin
    .from("announcements")
    .select("id, title, sent_at, reach_count, cohort_id")
    .eq("sent", true)
    .order("sent_at", { ascending: false })
    .limit(20);

  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));

  return {
    whatsapp: {
      sentToday,
      sentThisWeek,
      sentThisMonth,
      deliveryRate,
      failedMessages: (failed ?? []).map((m) => ({
        id: m.id,
        messageType: m.message_type,
        whatsappNumber: m.whatsapp_number,
        createdAt: m.created_at,
        messageBody: m.message_body.slice(0, 80),
      })),
    },
    weeklyReports: {
      lastSent: lastWeekly?.sent_at ?? lastWeekly?.created_at ?? null,
      nextScheduled: nextSunday.toISOString().slice(0, 10),
    },
    parentPortal: {
      activeLinks: activeLinks ?? 0,
      viewsThisWeek: viewsThisWeek ?? 0,
    },
    templates: (templates ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      bodyTemplate: t.body_template,
      updatedAt: t.updated_at,
    })),
    announcements: (announcements ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      sentAt: a.sent_at,
      reachCount: a.reach_count ?? 0,
      cohortId: a.cohort_id,
    })),
  };
}

export async function updateMessageTemplate(
  id: string,
  bodyTemplate: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("message_templates")
    .update({
      body_template: bodyTemplate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
