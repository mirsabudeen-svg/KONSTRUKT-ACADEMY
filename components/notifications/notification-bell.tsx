"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAsRead = async (id: string) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
    if (!open) loadNotifications();
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="relative text-muted-foreground hover:text-cyan-300"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-cyan-500/20 bg-zinc-950 shadow-xl">
          <div className="border-b border-white/5 px-4 py-3">
            <p className="font-display text-sm font-semibold">Notifications</p>
          </div>

          <ScrollArea className="max-h-80">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No new notifications
              </p>
            ) : (
              <ul className="p-2">
                {notifications.map((notification) => {
                  const style = TYPE_STYLES[notification.type];
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors hover:bg-white/5",
                          style.border,
                          !notification.read && style.bg
                        )}
                      >
                        <p className="text-sm font-medium">
                          {style.emoji} {notification.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                          {notification.message}
                        </p>
                        {notification.module_id != null && (
                          <Link
                            href={`/missions/${notification.module_id}`}
                            className="mt-2 inline-block text-xs text-cyan-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View mission →
                          </Link>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          <div className="border-t border-white/5 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={async () => {
                await fetch("/api/notifications", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ markAll: true }),
                });
                setNotifications((current) =>
                  current.map((n) => ({ ...n, read: true }))
                );
              }}
            >
              Mark all as read
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
