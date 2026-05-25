"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Bell, Plus, Send, Trash2, User } from "lucide-react";

import type {
  ParentContact,
  ParentNotificationPrefs,
} from "@/lib/communications/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { parentContactSchema } from "@/lib/validation/schemas";

export function StudentSettingsClient() {
  const { user } = useUser();
  const toast = useToast();
  const [contacts, setContacts] = useState<ParentContact[]>([]);
  const [prefs, setPrefs] = useState<ParentNotificationPrefs>({
    module_completions: true,
    weekly_reports: true,
    login_reminders: true,
    announcements: true,
  });
  const [form, setForm] = useState({
    parent_name: "",
    whatsapp_number: "",
    email: "",
    relationship: "parent" as "parent" | "guardian" | "sibling",
    notifications_enabled: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/parent-contacts");
    if (res.ok) {
      const json = await res.json();
      setContacts(json.contacts ?? []);
      if (json.prefs) setPrefs(json.prefs);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    const parsed = parentContactSchema.safeParse({
      parentName: form.parent_name,
      whatsappNumber: form.whatsapp_number,
      email: form.email || "",
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key =
          issue.path[0] === "parentName"
            ? "parent_name"
            : issue.path[0] === "whatsappNumber"
              ? "whatsapp_number"
              : "email";
        errors[key] = issue.message;
      }
      setFormErrors(errors);
      toast.error("Please fix form errors ❌");
      return;
    }

    const res = await fetch("/api/settings/parent-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({
        parent_name: "",
        whatsapp_number: "",
        email: "",
        relationship: "parent",
        notifications_enabled: true,
      });
      toast.success("Settings saved ✅");
      await load();
    } else {
      const json = await res.json();
      toast.error(json.error ?? "Failed to save ❌");
    }
  }

  async function deleteContact(id: string) {
    await fetch(`/api/settings/parent-contacts?contact_id=${id}`, {
      method: "DELETE",
    });
    toast.success("Contact removed");
    await load();
  }

  async function sendTest(phone: string) {
    const res = await fetch("/api/settings/parent-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", phone_number: phone }),
    });
    const json = await res.json();
    toast.info(
      json.success
        ? "Test notification queued ℹ️"
        : json.reason === "no_credentials"
          ? "Test logged (WhatsApp not configured) ℹ️"
          : "Test failed ❌"
    );
  }

  async function savePrefs(next: Partial<ParentNotificationPrefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    await fetch("/api/settings/parent-contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: merged }),
    });
    toast.success("Preferences saved ✅");
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Cadet";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Profile and parent/guardian notification contacts
        </p>
      </div>

      <section className="rounded-xl border border-cyan-500/15 bg-card/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-cyan-200">
          <User className="size-5" />
          My Profile
        </h2>
        <div className="flex items-center gap-4">
          <Avatar className="size-16 ring-2 ring-cyan-500/30">
            {user?.imageUrl ? (
              <AvatarImage src={user.imageUrl} alt={displayName} />
            ) : null}
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-cyan-500/15 bg-card/50 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-cyan-200">
          Parent / Guardian Contacts
        </h2>

        {contacts.length > 0 && (
          <ul className="mb-6 space-y-3">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{c.parent_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.whatsapp_number} · {c.relationship}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Portal: /parent/{c.portal_token.slice(0, 8)}…
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void sendTest(c.whatsapp_number)}
                  >
                    <Send className="mr-1 size-3" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    onClick={() => void deleteContact(c.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(e) => void addContact(e)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Parent name"
              value={form.parent_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, parent_name: e.target.value }))
              }
              aria-invalid={!!formErrors.parent_name}
              aria-describedby={
                formErrors.parent_name ? "parent-name-error" : undefined
              }
              className="rounded-lg border border-cyan-500/20 bg-background/50 px-3 py-2 text-sm"
            />
            {formErrors.parent_name && (
              <p id="parent-name-error" className="text-xs text-red-400">
                {formErrors.parent_name}
              </p>
            )}
            <input
              required
              placeholder="WhatsApp (+919876543210)"
              value={form.whatsapp_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, whatsapp_number: e.target.value }))
              }
              aria-invalid={!!formErrors.whatsapp_number}
              aria-describedby={
                formErrors.whatsapp_number ? "whatsapp-error" : undefined
              }
              className="rounded-lg border border-cyan-500/20 bg-background/50 px-3 py-2 text-sm"
            />
            {formErrors.whatsapp_number && (
              <p id="whatsapp-error" className="text-xs text-red-400">
                {formErrors.whatsapp_number}
              </p>
            )}
            <input
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="rounded-lg border border-cyan-500/20 bg-background/50 px-3 py-2 text-sm"
            />
            <select
              value={form.relationship}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  relationship: e.target.value as typeof form.relationship,
                }))
              }
              className="rounded-lg border border-cyan-500/20 bg-background/50 px-3 py-2 text-sm"
            >
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="sibling">Sibling</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.notifications_enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  notifications_enabled: e.target.checked,
                }))
              }
            />
            Enable notifications for this contact
          </label>
          <Button type="submit" className="gap-2 bg-cyan-600 hover:bg-cyan-500">
            <Plus className="size-4" />
            Add Contact
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-cyan-500/15 bg-card/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-cyan-200">
          <Bell className="size-5" />
          Notification Preferences
        </h2>
        <div className="space-y-3 text-sm">
          {(
            [
              ["module_completions", "Module completions"],
              ["weekly_reports", "Weekly reports"],
              ["login_reminders", "Login reminders"],
              ["announcements", "Announcements"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) =>
                  void savePrefs({ [key]: e.target.checked })
                }
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
