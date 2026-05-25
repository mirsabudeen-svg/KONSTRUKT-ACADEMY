"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";

import { BadgeCard } from "@/components/progress/badge-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CompletionCelebrationProps = {
  moduleId: number;
  badgeName: string;
  moduleTitle: string;
  score?: number | null;
  show: boolean;
  onDismiss: () => void;
};

function fireConfetti() {
  const colors = ["#00FFC0", "#8B5CF6", "#FFFFFF"];
  const end = Date.now() + 1000;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();

  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.5 },
    colors,
  });
}

function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span className="font-display text-4xl font-bold text-cyan-300">
      {display}
      <span className="text-lg text-muted-foreground">/100</span>
    </span>
  );
}

export function CompletionCelebration({
  moduleId,
  badgeName,
  moduleTitle,
  score,
  show,
  onDismiss,
}: CompletionCelebrationProps) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(fireConfetti, 800);
      return () => clearTimeout(t);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onDismiss}
            aria-hidden
          />

          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/50 p-8 text-center shadow-[0_0_60px_-10px] shadow-cyan-500/30"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
              className="mx-auto max-w-[180px]"
            >
              <BadgeCard
                badge_name={badgeName}
                module_title={moduleTitle}
                module_id={moduleId}
                earned
                score={score}
                earned_at={new Date()}
              />
            </motion.div>

            <motion.h2
              className="font-display mt-6 text-2xl font-bold text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.5 }}
            >
              Mission Complete! 🎉
            </motion.h2>

            {score != null && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.3 }}
              >
                <AnimatedScore target={score} />
              </motion.div>
            )}

            <motion.p
              className="mt-4 text-lg font-semibold text-violet-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.3 }}
            >
              Badge earned: {badgeName}
            </motion.p>

            <motion.button
              type="button"
              className={cn(
                buttonVariants(),
                "mt-8 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8, duration: 0.3 }}
              onClick={onDismiss}
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MissionCelebrationGate({
  moduleId,
  badgeName,
  moduleTitle,
  score,
  completed,
}: {
  moduleId: number;
  badgeName: string;
  moduleTitle: string;
  score?: number | null;
  completed: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(completed);

  const dismiss = useCallback(() => {
    setShow(false);
    router.replace(`/missions/${moduleId}`, { scroll: false });
  }, [moduleId, router]);

  return (
    <CompletionCelebration
      moduleId={moduleId}
      badgeName={badgeName}
      moduleTitle={moduleTitle}
      score={score}
      show={show}
      onDismiss={dismiss}
    />
  );
}
