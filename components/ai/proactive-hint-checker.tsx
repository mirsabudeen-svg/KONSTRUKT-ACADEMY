"use client";

import { useEffect, useRef } from "react";

const THROTTLE_MS = 60 * 60 * 1000;
const STORAGE_KEY = "konstrukt_hint_check_at";

export function ProactiveHintChecker() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const lastRun = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
    if (Date.now() - lastRun < THROTTLE_MS) return;

    void fetch("/api/ai/check-hints", { method: "POST" })
      .then(() => {
        sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
