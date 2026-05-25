import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { SafetySettings } from "@/lib/safety/types";

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  contentScanningEnabled: true,
  plagiarismDetectionEnabled: true,
  sessionBreakMinutes: 45,
  idleDetectionMinutes: 15,
  aiGenerationThreshold: 0.8,
  similarityThreshold: 0.85,
  autoBlockHighSeverity: true,
  notifyTrainerOnFlags: true,
};

export async function fetchSafetySettings(): Promise<SafetySettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SAFETY_SETTINGS;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "safety")
    .maybeSingle();

  if (!data?.value) return DEFAULT_SAFETY_SETTINGS;

  return { ...DEFAULT_SAFETY_SETTINGS, ...(data.value as SafetySettings) };
}
