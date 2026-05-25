"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";

import type { PlatformSettings } from "@/lib/admin/settings";
import { Button } from "@/components/ui/button";

export function SettingsClient() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const json = await res.json();
      setSettings(json.settings);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
        setMessage("Settings saved successfully.");
      } else {
        setMessage("Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <p className="text-muted-foreground">Loading platform settings…</p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-orange-300">
            Platform Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure tokens, modules, AI, and platform info
          </p>
        </div>
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="gap-2 bg-orange-600 hover:bg-orange-500"
        >
          <Save className="size-4" />
          {saving ? "Saving…" : "Save All"}
        </Button>
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}

      <Section title="Token Settings">
        <Field label="Default tokens for new students">
          <input
            type="number"
            min={0}
            value={settings.tokens.defaultForNewStudents}
            onChange={(e) =>
              setSettings({
                ...settings,
                tokens: {
                  ...settings.tokens,
                  defaultForNewStudents: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Max tokens per student">
          <input
            type="number"
            min={0}
            value={settings.tokens.maxPerStudent}
            onChange={(e) =>
              setSettings({
                ...settings,
                tokens: {
                  ...settings.tokens,
                  maxPerStudent: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Auto-refill threshold">
          <input
            type="number"
            min={0}
            value={settings.tokens.autoRefillThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                tokens: {
                  ...settings.tokens,
                  autoRefillThreshold: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
      </Section>

      <Section title="Module Settings">
        <Field label="Module unlock delay (days after previous)">
          <input
            type="number"
            min={0}
            value={settings.modules.unlockDelayDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                modules: {
                  ...settings.modules,
                  unlockDelayDays: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Enabled modules: {settings.modules.enabled.join(", ")}
        </p>
      </Section>

      <Section title="AI Settings">
        <Field label="OpenAI model">
          <select
            value={settings.ai.model}
            onChange={(e) =>
              setSettings({
                ...settings,
                ai: { ...settings.ai, model: e.target.value },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          >
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
        </Field>
        <Field label="Tutor max response length">
          <input
            type="number"
            min={100}
            value={settings.ai.tutorMaxResponseLength}
            onChange={(e) =>
              setSettings({
                ...settings,
                ai: {
                  ...settings.ai,
                  tutorMaxResponseLength: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Code review sensitivity">
          <select
            value={settings.ai.codeReviewSensitivity}
            onChange={(e) =>
              setSettings({
                ...settings,
                ai: {
                  ...settings.ai,
                  codeReviewSensitivity: e.target.value,
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Proactive hint delay (days)">
          <input
            type="number"
            min={0}
            value={settings.ai.proactiveHintDelayDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                ai: {
                  ...settings.ai,
                  proactiveHintDelayDays: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
      </Section>

      <Section title="Safety Settings">
        <Field label="Content scanning">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.safety.contentScanningEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  safety: {
                    ...settings.safety,
                    contentScanningEnabled: e.target.checked,
                  },
                })
              }
              className="accent-orange-500"
            />
            Enabled
          </label>
        </Field>
        <Field label="Plagiarism detection">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.safety.plagiarismDetectionEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  safety: {
                    ...settings.safety,
                    plagiarismDetectionEnabled: e.target.checked,
                  },
                })
              }
              className="accent-orange-500"
            />
            Enabled
          </label>
        </Field>
        <Field label="Session break reminder (minutes)">
          <input
            type="number"
            min={15}
            max={120}
            value={settings.safety.sessionBreakMinutes}
            onChange={(e) =>
              setSettings({
                ...settings,
                safety: {
                  ...settings.safety,
                  sessionBreakMinutes: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Idle detection (minutes)">
          <input
            type="number"
            min={5}
            max={60}
            value={settings.safety.idleDetectionMinutes}
            onChange={(e) =>
              setSettings({
                ...settings,
                safety: {
                  ...settings.safety,
                  idleDetectionMinutes: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="AI generation threshold (0–1)">
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={settings.safety.aiGenerationThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                safety: {
                  ...settings.safety,
                  aiGenerationThreshold: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Similarity threshold (0–1)">
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={settings.safety.similarityThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                safety: {
                  ...settings.safety,
                  similarityThreshold: Number(e.target.value),
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Auto-block high severity">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.safety.autoBlockHighSeverity}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  safety: {
                    ...settings.safety,
                    autoBlockHighSeverity: e.target.checked,
                  },
                })
              }
              className="accent-orange-500"
            />
            Yes
          </label>
        </Field>
        <Field label="Notify trainer on flags">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.safety.notifyTrainerOnFlags}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  safety: {
                    ...settings.safety,
                    notifyTrainerOnFlags: e.target.checked,
                  },
                })
              }
              className="accent-orange-500"
            />
            Yes
          </label>
        </Field>
      </Section>

      <Section title="Platform Info">
        <Field label="Academy name">
          <input
            value={settings.platform.academyName}
            onChange={(e) =>
              setSettings({
                ...settings,
                platform: {
                  ...settings.platform,
                  academyName: e.target.value,
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            value={settings.platform.contactEmail}
            onChange={(e) =>
              setSettings({
                ...settings,
                platform: {
                  ...settings.platform,
                  contactEmail: e.target.value,
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </Field>
        <Field label="Support WhatsApp number">
          <input
            value={settings.platform.supportWhatsApp}
            onChange={(e) =>
              setSettings({
                ...settings,
                platform: {
                  ...settings.platform,
                  supportWhatsApp: e.target.value,
                },
              })
            }
            className="w-full max-w-xs rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
            placeholder="+91…"
          />
        </Field>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orange-500/15 bg-card/50 p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-orange-200">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
