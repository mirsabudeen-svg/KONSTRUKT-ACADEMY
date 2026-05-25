import { auth } from "@clerk/nextjs/server";

import { fetchStudentNotifications } from "@/lib/notifications/queries";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await fetchStudentNotifications(true);
  return Response.json({ notifications });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: { id?: string; markAll?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.markAll) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("student_id", userId)
      .eq("read", false);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  }

  if (!body.id) {
    return Response.json({ error: "id or markAll is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", body.id)
    .eq("student_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
