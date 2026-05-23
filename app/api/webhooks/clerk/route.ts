import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const MODULE_COUNT = 10;

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("CLERK_WEBHOOK_SECRET not configured", { status: 500 });
  }

  if (!isSupabaseConfigured()) {
    return new Response("Supabase not configured", { status: 503 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);

  let event: WebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createSupabaseAdmin();

  if (event.type === "user.created") {
    const { id } = event.data;
    const role =
      (event.data.public_metadata?.role as string | undefined) ?? "student";

    const { error } = await admin.from("users").upsert({
      id,
      role: ["student", "trainer", "admin"].includes(role) ? role : "student",
      tokens_remaining: 10,
    });

    if (error) {
      console.error("[clerk webhook] users:", error.message);
      return new Response(error.message, { status: 500 });
    }

    const { count } = await admin
      .from("progress")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id);

    if (!count) {
      const rows = Array.from({ length: MODULE_COUNT }, (_, i) => {
        const moduleId = i + 1;
        return {
          student_id: id,
          module_id: moduleId,
          status: moduleId === 1 ? "in_progress" : "locked",
          score: 0,
        };
      });
      await admin.from("progress").insert(rows);
    }
  }

  if (event.type === "user.updated") {
    const { id } = event.data;
    const role =
      (event.data.public_metadata?.role as string | undefined) ?? "student";

    await admin
      .from("users")
      .update({
        role: ["student", "trainer", "admin"].includes(role) ? role : "student",
      })
      .eq("id", id);
  }

  if (event.type === "user.deleted") {
    const { id } = event.data;
    await admin.from("users").delete().eq("id", id);
  }

  return new Response("OK", { status: 200 });
}
