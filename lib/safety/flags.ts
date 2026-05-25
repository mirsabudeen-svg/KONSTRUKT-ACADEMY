import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchSafetySettings } from "@/lib/safety/settings";
import type { SafetyFlagType, SafetySeverity } from "@/lib/safety/types";

export async function createSafetyFlag(input: {
  studentId: string | null;
  flagType: SafetyFlagType | string;
  severity: SafetySeverity;
  source: string;
  contentSnippet?: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("safety_flags")
    .insert({
      student_id: input.studentId,
      flag_type: input.flagType,
      severity: input.severity,
      source: input.source,
      content_snippet: input.contentSnippet?.slice(0, 500) ?? null,
      details: input.details ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createSafetyFlag]", error.message);
    return null;
  }

  const settings = await fetchSafetySettings();

  if (settings.notifyTrainerOnFlags && input.studentId) {
    const severityLabel =
      input.severity === "critical" ? "🚨 CRITICAL" : "⚠️ Safety";

    await admin.from("notifications").insert({
      student_id: input.studentId,
      type: "trainer_message",
      title: `${severityLabel}: ${input.flagType.replace(/_/g, " ")}`,
      message: `Safety flag from ${input.source}. Review in Safety Dashboard.`,
      module_id: null,
      read: false,
    });
  }

  if (input.severity === "critical") {
    const { data: admins } = await admin
      .from("users")
      .select("id")
      .eq("role", "admin");

    for (const adminUser of admins ?? []) {
      await admin.from("notifications").insert({
        student_id: adminUser.id,
        type: "trainer_message",
        title: "🚨 Critical Safety Flag",
        message: `${input.flagType} from ${input.source}. Immediate review required.`,
        module_id: null,
        read: false,
      });
    }
  }

  return data.id;
}
