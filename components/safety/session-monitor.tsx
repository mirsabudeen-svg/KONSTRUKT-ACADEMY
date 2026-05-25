"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";

const IDLE_MS = 5 * 60 * 1000;
const TICK_MS = 60 * 1000;
const BREAK_DEFAULT_MIN = 45;

export function SessionMonitor() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [showBreak, setShowBreak] = useState(false);
  const [paused, setPaused] = useState(false);
  const lastActivity = useRef<number>(0);
  const idleMinutes = useRef(0);

  useEffect(() => {
    lastActivity.current = Date.now();
  }, []);

  const syncSession = useCallback(
    async (mins: number, idle: number, page?: string) => {
      if (!sessionId || paused) return;
      await fetch("/api/safety/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          session_id: sessionId,
          active_minutes: mins,
          idle_minutes: idle,
          page,
        }),
      });
    },
    [sessionId, paused]
  );

  useEffect(() => {
    void fetch("/api/safety/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    })
      .then((r) => r.json())
      .then((d) => setSessionId(d.session_id ?? null))
      .catch(() => {});

    void fetch("/api/safety/session")
      .then((r) => r.json())
      .then((d) => setTodayMinutes(d.todayMinutes ?? 0))
      .catch(() => {});

    return () => {
      if (sessionId) {
        void fetch("/api/safety/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end", session_id: sessionId }),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("click", bump);
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("click", bump);
    };
  }, []);

  useEffect(() => {
    if (!sessionId || paused) return;

    const interval = setInterval(() => {
      const isVisible = document.visibilityState === "visible";
      const idle = Date.now() - lastActivity.current > IDLE_MS;

      if (!isVisible || idle) {
        idleMinutes.current += 1;
      } else {
        setActiveMinutes((m) => {
          const next = m + 1;
          void syncSession(next, idleMinutes.current, window.location.pathname);
          if (next >= BREAK_DEFAULT_MIN) {
            void fetch("/api/safety/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "health",
                session_id: sessionId,
              }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (d.health?.needs_break) setShowBreak(true);
              })
              .catch(() => {});
          }
          return next;
        });
        setTodayMinutes((t) => t + 1);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [sessionId, paused, syncSession]);

  const takeBreak = () => {
    setPaused(true);
    setShowBreak(false);
    setTimeout(() => setPaused(false), 10 * 60 * 1000);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-30 hidden rounded-lg border border-cyan-500/20 bg-black/60 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur-sm sm:block">
        <div className="flex items-center gap-2">
          <Brain className="size-3 text-cyan-400" />
          <span>
            Session: {activeMinutes}m · Today: {todayMinutes}m
            {paused && " · On break"}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showBreak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <Coffee className="size-8 text-cyan-400" />
                <div>
                  <h2 className="font-display text-lg font-semibold text-cyan-200">
                    Time for a break!
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You&apos;ve been learning for {activeMinutes} minutes. Take
                    a 10 minute break to keep your brain fresh!
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  onClick={takeBreak}
                >
                  Take a Break
                </Button>
                <Button variant="ghost" onClick={() => setShowBreak(false)}>
                  Keep Going
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
