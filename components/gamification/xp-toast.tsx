"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";

import { formatEventLabel } from "@/lib/gamification/constants";

type XPToast = {
  id: string;
  xp: number;
  label: string;
};

type XPToastContextValue = {
  showXPToast: (xp: number, eventType: string, customLabel?: string) => void;
};

const XPToastContext = createContext<XPToastContextValue | null>(null);

export function useXPToast() {
  const ctx = useContext(XPToastContext);
  if (!ctx) {
    return { showXPToast: () => {} };
  }
  return ctx;
}

export function XPToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<XPToast[]>([]);

  const showXPToast = useCallback(
    (xp: number, eventType: string, customLabel?: string) => {
      const id = crypto.randomUUID();
      const label = customLabel ?? formatEventLabel(eventType);
      setToasts((prev) => [...prev, { id, xp, label }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <XPToastContext.Provider value={{ showXPToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-zinc-950/95 px-4 py-3 shadow-lg shadow-cyan-500/20 backdrop-blur-sm"
            >
              <Zap className="size-5 text-cyan-400" aria-hidden />
              <div>
                <p className="font-display text-sm font-bold text-cyan-300">
                  +{toast.xp} XP
                </p>
                <p className="text-xs text-muted-foreground">{toast.label}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </XPToastContext.Provider>
  );
}
