import { auth } from "@clerk/nextjs/server";

import { sendTestWhatsApp } from "@/lib/communications/whatsapp";
import { getUserRoleById } from "@/lib/auth/trainer";
import { isAdminRole } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isAdminRole(role)) {
    return Response.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  let body: { phone_number?: string; message?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.phone_number?.trim()) {
    return Response.json({ error: "phone_number required" }, { status: 400 });
  }

  const result = await sendTestWhatsApp(body.phone_number, body.message);
  return Response.json(result);
}
