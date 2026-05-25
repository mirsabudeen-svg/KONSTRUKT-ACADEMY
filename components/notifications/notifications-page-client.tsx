"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";

import { NoNotifications } from "@/components/empty/empty-state";
import { Button } from "@/components/ui/button";
import type { DbNotification, NotificationType } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<
  NotificationType,
  { border: string; bg: string; emoji: string }
> = {
  approved: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    emoji: "🎉",
  },
  rejected: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    emoji: "📝",
  },
  unlocked: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    emoji: "🔓",
  },
  level_up: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    emoji: "🚀",
  },
  streak_bonus: {
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    emoji: "🔥",
  },
  proactive_hint: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    emoji: "💡",
  },
  trainer_message: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    emoji: "✉️",
  },
  learning_alert: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    emoji: "⚠️",
  },
};

export function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-500/80">
            Inbox
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">Notifications</h1>
        </div>
        {notifications.some((n) => !n.read) && (
          <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center py-16 text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-6 animate-spin" aria-hidden />
          <span className="sr-only">Loading notifications</span>
        </div>
      ) : notifications.length === 0 ? (
        <NoNotifications />
      ) : (
        <ul className="space-y-3" aria-label="Notifications">
          {notifications.map((n) => {
            const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.proactive_hint;
            return (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border px-4 py-4",
                  style.border,
                  style.bg,
                  !n.read && "ring-1 ring-cyan-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden>
                    {style.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    {n.message && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <Bell className="size-4 shrink-0 text-cyan-400" aria-label="Unread" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
