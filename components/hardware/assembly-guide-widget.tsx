"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Loader2, Wrench, X } from "lucide-react";

import { TokenPredictor } from "@/components/hardware/token-predictor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssemblyHelpResult } from "@/lib/hardware/types";

type AssemblyGuideWidgetProps = {
  moduleId: number;
};

export function AssemblyGuideWidget({ moduleId }: AssemblyGuideWidgetProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [help, setHelp] = useState<AssemblyHelpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hardware/assembly-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setHelp(data.help);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
      setShowTokenModal(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex size-14 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-lg backdrop-blur-sm transition-colors hover:bg-amber-500/25"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Assembly help"
      >
        <Wrench className="size-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center sm:justify-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-amber-500/20 px-5 py-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="size-5 text-amber-400" />
                  <h2 className="font-display font-semibold text-amber-200">
                    Assembly Guide
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-5">
                <p className="text-xs text-muted-foreground">
                  Hardware-specific help for this mission — wiring, assembly,
                  and mechanical alignment only.
                </p>

                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How do I align the servo horn?"
                  className="mt-3 border-amber-500/20 bg-black/30 text-sm"
                  rows={3}
                />

                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}

                {help && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm leading-relaxed text-amber-100/90">
                      {help.answer}
                    </p>

                    {help.steps.length > 0 && (
                      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                        {help.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDiagram((v) => !v)}
                    >
                      {showDiagram ? "Hide diagram" : "Show me the diagram"}
                    </Button>

                    {showDiagram && (
                      <pre className="overflow-auto rounded-lg border border-cyan-500/20 bg-black/40 p-3 font-mono text-[10px] leading-tight text-cyan-300">
                        {help.diagramAscii}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-amber-500/20 px-5 py-4">
                <Button
                  type="button"
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-500"
                  disabled={loading || !question.trim()}
                  onClick={() => setShowTokenModal(true)}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wrench className="size-4" />
                  )}
                  Ask Assembly Guide
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TokenPredictor
        open={showTokenModal}
        cost={1}
        actionLabel="Assembly guide question"
        loading={loading}
        onProceed={() => void askQuestion()}
        onCancel={() => setShowTokenModal(false)}
      />
    </>
  );
}
