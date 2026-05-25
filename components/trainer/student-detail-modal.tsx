"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrainerNotes } from "@/components/trainer/trainer-notes";
import type { StudentDetailData } from "@/lib/trainer/student-detail";
import { TOKEN_REFILL_AMOUNT } from "@/lib/trainer/constants";
import { cn } from "@/lib/utils";

type StudentDetailModalProps = {
  studentId: string | null;
  moduleId?: number | null;
  onClose: () => void;
};

const RISK_STYLES = {
  on_track: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  at_risk: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
};

export function StudentDetailModal({
  studentId,
  moduleId,
  onClose,
}: StudentDetailModalProps) {
  const [student, setStudent] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStudent(null);
      return;
    }

    setLoading(true);
    void fetch(`/api/trainer/students?student_id=${studentId}`)
      .then((res) => res.json())
      .then((data) => setStudent(data.student ?? null))
      .catch(() => setError("Failed to load student"))
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleRefill = useCallback(async () => {
    if (!studentId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/trainer/refill-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refill failed");
      setStudent((s) =>
        s ? { ...s, tokensRemaining: data.tokensRemaining } : s
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refill failed");
    } finally {
      setBusy(false);
    }
  }, [studentId]);

  const handleSendMessage = useCallback(async () => {
    if (!studentId || !message.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/trainer/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          student_id: studentId,
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Send failed");
      }
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }, [message, studentId]);

  const handleFlagAtRisk = useCallback(async () => {
    if (!studentId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/analyze-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (!res.ok) throw new Error("Could not flag student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag failed");
    } finally {
      setBusy(false);
    }
  }, [studentId]);

  if (!studentId) return null;

  const moduleSubmissions = moduleId
    ? student?.submissions.filter((s) => s.moduleId === moduleId)
    : student?.submissions;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-violet-500/20 px-6 py-4">
          {loading || !student ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading student…
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <Avatar className="size-14 ring-2 ring-violet-500/30">
                {student.avatarUrl && (
                  <AvatarImage src={student.avatarUrl} alt={student.name} />
                )}
                <AvatarFallback className="bg-violet-500/20 text-lg text-violet-200">
                  {student.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {student.name}
                </h2>
                <p className="text-sm text-muted-foreground">{student.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className={RISK_STYLES[student.riskLevel]}>
                    {student.riskLevel.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="size-3" />
                    {student.tokensRemaining} tokens
                  </Badge>
                  {student.currentModuleTitle && (
                    <Badge variant="outline">
                      {student.currentModuleTitle} ·{" "}
                      {student.currentModuleStatus?.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          {student && (
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                  Progress Overview
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {[
                    ["Completion", `${student.completionPercent}%`],
                    ["Avg score", student.averageScore ?? "—"],
                    ["XP", String(student.totalXp)],
                    ["Level", student.level],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                    >
                      <p className="text-[10px] uppercase text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-mono text-sm">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {student.missions.map((m) => (
                    <span
                      key={m.id}
                      title={m.title}
                      className={cn(
                        "size-7 rounded text-center text-[10px] leading-7",
                        m.displayStatus === "completed" &&
                          "bg-emerald-500/30 text-emerald-200",
                        m.displayStatus === "in_progress" &&
                          "bg-violet-500/30 text-violet-200",
                        m.displayStatus === "pending_review" &&
                          "bg-amber-500/30 text-amber-200",
                        m.displayStatus === "ready" &&
                          "bg-cyan-500/20 text-cyan-200",
                        m.displayStatus === "locked" &&
                          "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      {m.id}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                  Submission History
                  {moduleId ? ` · Module ${moduleId}` : ""}
                </h3>
                <ul className="mt-3 space-y-2">
                  {(moduleSubmissions ?? []).slice(0, 8).map((sub) => (
                    <li
                      key={sub.id}
                      className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span>
                          M{sub.moduleId}: {sub.moduleTitle}
                        </span>
                        <Badge variant="outline">{sub.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                        {sub.score != null && ` · ${sub.score}/100`}
                      </p>
                      {sub.feedback && (
                        <p className="mt-1 text-xs">{sub.feedback}</p>
                      )}
                    </li>
                  ))}
                  {!moduleSubmissions?.length && (
                    <li className="text-sm text-muted-foreground">
                      No submissions yet
                    </li>
                  )}
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                  Tutor Activity
                </h3>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p>{student.tutorConversationCount} conversations</p>
                  <p>{student.tutorMessageCount} messages</p>
                  <p>
                    Last:{" "}
                    {student.lastTutorInteraction
                      ? new Date(student.lastTutorInteraction).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                {student.tutorTopics.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Topics: {student.tutorTopics.join(", ")}
                  </p>
                )}
              </section>

              <TrainerNotes
                studentId={student.studentId}
                initialNotes={student.notes}
              />

              <section className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleRefill()}
                >
                  Refill +{TOKEN_REFILL_AMOUNT}
                </Button>
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Quick message…"
                    className="flex-1 rounded-lg border border-violet-500/20 bg-black/40 px-3 py-1.5 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !message.trim()}
                    onClick={() => void handleSendMessage()}
                  >
                    <MessageSquare className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 border-amber-500/30 text-amber-300"
                  disabled={busy}
                  onClick={() => void handleFlagAtRisk()}
                >
                  <AlertTriangle className="size-3.5" />
                  Flag at-risk
                </Button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
