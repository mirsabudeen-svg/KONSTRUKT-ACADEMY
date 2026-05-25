import { auth } from "@clerk/nextjs/server";

import {
  addParentContact,
  deleteParentContact,
  fetchParentContacts,
  fetchParentNotificationPrefs,
  updateParentContact,
  updateParentNotificationPrefs,
} from "@/lib/communications/parent-contacts";
import { sendTestWhatsApp } from "@/lib/communications/whatsapp";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await fetchParentContacts(userId);
  const prefs = await fetchParentNotificationPrefs(userId);

  return Response.json({ contacts, prefs });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: "add" | "test";
    parent_name?: string;
    whatsapp_number?: string;
    email?: string | null;
    relationship?: "parent" | "guardian" | "sibling";
    notifications_enabled?: boolean;
    phone_number?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "test") {
    const phone = body.phone_number ?? body.whatsapp_number;
    if (!phone) {
      return Response.json({ error: "phone_number required" }, { status: 400 });
    }
    const result = await sendTestWhatsApp(
      phone,
      "✅ KONSTRUKT Academy test notification — your parent contact is set up correctly!"
    );
    return Response.json(result);
  }

  const result = await addParentContact(userId, {
    parentName: body.parent_name ?? "",
    whatsappNumber: body.whatsapp_number ?? "",
    email: body.email,
    relationship: body.relationship,
    notificationsEnabled: body.notifications_enabled,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ contact: result.contact });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    contact_id?: string;
    parent_name?: string;
    whatsapp_number?: string;
    email?: string | null;
    relationship?: "parent" | "guardian" | "sibling";
    notifications_enabled?: boolean;
    prefs?: Partial<{
      module_completions: boolean;
      weekly_reports: boolean;
      login_reminders: boolean;
      announcements: boolean;
    }>;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.prefs) {
    const result = await updateParentNotificationPrefs(userId, body.prefs);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  if (!body.contact_id) {
    return Response.json({ error: "contact_id required" }, { status: 400 });
  }

  const result = await updateParentContact(userId, body.contact_id, {
    parentName: body.parent_name,
    whatsappNumber: body.whatsapp_number,
    email: body.email,
    relationship: body.relationship,
    notificationsEnabled: body.notifications_enabled,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contact_id");

  if (!contactId) {
    return Response.json({ error: "contact_id required" }, { status: 400 });
  }

  const result = await deleteParentContact(userId, contactId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}
