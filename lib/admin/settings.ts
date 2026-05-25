import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import type { SafetySettings } from "@/lib/safety/types";
import { DEFAULT_SAFETY_SETTINGS } from "@/lib/safety/settings";

export type TokenSettings = {
  defaultForNewStudents: number;
  maxPerStudent: number;
  autoRefillThreshold: number;
};

export type ModuleSettings = {
  enabled: number[];
  order: number[];
  unlockDelayDays: number;
};

export type AiSettings = {
  model: string;
  tutorMaxResponseLength: number;
  codeReviewSensitivity: string;
  proactiveHintDelayDays: number;
};

export type PlatformInfoSettings = {
  academyName: string;
  contactEmail: string;
  supportWhatsApp: string;
};

export type PlatformSettings = {
  tokens: TokenSettings;
  modules: ModuleSettings;
  ai: AiSettings;
  platform: PlatformInfoSettings;
  safety: SafetySettings;
};

const DEFAULTS: PlatformSettings = {
  tokens: {
    defaultForNewStudents: 10,
    maxPerStudent: 20,
    autoRefillThreshold: 2,
  },
  modules: {
    enabled: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    unlockDelayDays: 0,
  },
  ai: {
    model: "gpt-4o-mini",
    tutorMaxResponseLength: 500,
    codeReviewSensitivity: "medium",
    proactiveHintDelayDays: 3,
  },
  platform: {
    academyName: "KONSTRUKT Academy",
    contactEmail: "admin@konstrukt.io",
    supportWhatsApp: "",
  },
  safety: DEFAULT_SAFETY_SETTINGS,
};

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  if (!isSupabaseConfigured()) return DEFAULTS;

  const admin = createSupabaseAdmin();
  const { data } = await admin.from("platform_settings").select("key, value");

  const settings = { ...DEFAULTS };

  for (const row of data ?? []) {
    if (row.key === "tokens") {
      settings.tokens = { ...settings.tokens, ...(row.value as TokenSettings) };
    } else if (row.key === "modules") {
      settings.modules = {
        ...settings.modules,
        ...(row.value as ModuleSettings),
      };
    } else if (row.key === "ai") {
      settings.ai = { ...settings.ai, ...(row.value as AiSettings) };
    } else if (row.key === "platform") {
      settings.platform = {
        ...settings.platform,
        ...(row.value as PlatformInfoSettings),
      };
    } else if (row.key === "safety") {
      settings.safety = {
        ...settings.safety,
        ...(row.value as SafetySettings),
      };
    }
  }

  return settings;
}

export async function updatePlatformSettings(
  partial: Partial<PlatformSettings>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured" };
  }

  const admin = createSupabaseAdmin();
  const current = await fetchPlatformSettings();
  const merged: PlatformSettings = {
    tokens: { ...current.tokens, ...partial.tokens },
    modules: { ...current.modules, ...partial.modules },
    ai: { ...current.ai, ...partial.ai },
    platform: { ...current.platform, ...partial.platform },
    safety: { ...current.safety, ...partial.safety },
  };

  const entries: { key: string; value: unknown }[] = [
    { key: "tokens", value: merged.tokens },
    { key: "modules", value: merged.modules },
    { key: "ai", value: merged.ai },
    { key: "platform", value: merged.platform },
    { key: "safety", value: merged.safety },
  ];

  for (const entry of entries) {
    const { error } = await admin.from("platform_settings").upsert(
      {
        key: entry.key,
        value: entry.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
