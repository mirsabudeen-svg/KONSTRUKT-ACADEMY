"use client";

import { useEffect, useRef } from "react";

import { useXPToast } from "@/components/gamification/xp-toast";
import { formatEventLabel } from "@/lib/gamification/constants";

export function LoginXpTracker() {
  const { showXPToast } = useXPToast();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    fetch("/api/auth/login-xp", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;

        if (data.daily_xp_awarded) {
          showXPToast(10, "daily_login");
        }

        if (data.milestone_reached && data.milestone?.xp_bonus) {
          showXPToast(
            data.milestone.xp_bonus,
            data.milestone.days === 7 ? "streak_7_days" : "streak_30_days",
            data.milestone.label
          );
        }
      })
      .catch(() => {});
  }, [showXPToast]);

  return null;
}

export function XPEventListener() {
  const { showXPToast } = useXPToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ xp: number; eventType: string; label?: string }>).detail;
      if (detail?.xp) {
        showXPToast(detail.xp, detail.eventType, detail.label);
      }
    };

    window.addEventListener("xp-earned", handler);
    return () => window.removeEventListener("xp-earned", handler);
  }, [showXPToast]);

  return null;
}

export function dispatchXPEarned(xp: number, eventType: string, label?: string) {
  window.dispatchEvent(
    new CustomEvent("xp-earned", {
      detail: { xp, eventType, label: label ?? formatEventLabel(eventType) },
    })
  );
}
