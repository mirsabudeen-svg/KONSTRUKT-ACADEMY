import "server-only";

import { randomBytes } from "crypto";

import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const TOKEN_ROTATION_DAYS = 30;

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

export async function getStudentDisplayName(studentId: string): Promise<string> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(studentId);
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Student"
    );
  } catch {
    return "Student";
  }
}

export async function ensurePortalTokenFresh(
  contactId: string,
  currentToken: string,
  tokenCreatedAt: string
): Promise<string> {
  const admin = createSupabaseAdmin();
  const created = new Date(tokenCreatedAt);
  const ageDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays < TOKEN_ROTATION_DAYS) return currentToken;

  const newToken = randomBytes(32).toString("hex");
  await admin
    .from("parent_contacts")
    .update({
      portal_token: newToken,
      portal_token_created_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  return newToken;
}

export async function getMessageTemplate(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("message_templates")
    .select("body_template")
    .eq("id", id)
    .maybeSingle();
  return data?.body_template ?? null;
}

export async function logPortalView(
  portalToken: string,
  parentContactId: string | null,
  section?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = createSupabaseAdmin();
  await admin.from("parent_portal_views").insert({
    portal_token: portalToken,
    parent_contact_id: parentContactId,
    section: section ?? "overview",
  });
}
