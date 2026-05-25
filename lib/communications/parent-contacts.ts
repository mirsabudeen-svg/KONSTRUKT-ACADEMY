import "server-only";

import {
  DEFAULT_PARENT_NOTIFICATION_PREFS,
  type ParentContact,
  type ParentNotificationPrefs,
} from "@/lib/communications/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function fetchParentContacts(
  studentId: string
): Promise<ParentContact[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("parent_contacts")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ParentContact[];
}

export async function fetchParentNotificationPrefs(
  studentId: string
): Promise<ParentNotificationPrefs> {
  if (!isSupabaseConfigured()) return DEFAULT_PARENT_NOTIFICATION_PREFS;

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

export async function addParentContact(
  studentId: string,
  input: {
    parentName: string;
    whatsappNumber: string;
    email?: string | null;
    relationship?: "parent" | "guardian" | "sibling";
    notificationsEnabled?: boolean;
  }
): Promise<{ ok: true; contact: ParentContact } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  if (!input.parentName.trim() || !input.whatsappNumber.trim()) {
    return { ok: false, error: "Name and WhatsApp number required" };
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("parent_contacts")
    .insert({
      student_id: studentId,
      parent_name: input.parentName.trim(),
      whatsapp_number: input.whatsappNumber.trim(),
      email: input.email?.trim() || null,
      relationship: input.relationship ?? "parent",
      notifications_enabled: input.notificationsEnabled ?? true,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed" };
  return { ok: true, contact: data as ParentContact };
}

export async function updateParentContact(
  studentId: string,
  contactId: string,
  input: Partial<{
    parentName: string;
    whatsappNumber: string;
    email: string | null;
    relationship: "parent" | "guardian" | "sibling";
    notificationsEnabled: boolean;
  }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const updates: Record<string, unknown> = {};
  if (input.parentName !== undefined) updates.parent_name = input.parentName.trim();
  if (input.whatsappNumber !== undefined) {
    updates.whatsapp_number = input.whatsappNumber.trim();
  }
  if (input.email !== undefined) updates.email = input.email;
  if (input.relationship !== undefined) updates.relationship = input.relationship;
  if (input.notificationsEnabled !== undefined) {
    updates.notifications_enabled = input.notificationsEnabled;
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("parent_contacts")
    .update(updates)
    .eq("id", contactId)
    .eq("student_id", studentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteParentContact(
  studentId: string,
  contactId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("parent_contacts")
    .delete()
    .eq("id", contactId)
    .eq("student_id", studentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateParentNotificationPrefs(
  studentId: string,
  prefs: Partial<ParentNotificationPrefs>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const current = await fetchParentNotificationPrefs(studentId);
  const merged = { ...current, ...prefs };

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("users")
    .update({ parent_notification_prefs: merged })
    .eq("id", studentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
