"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoAlerts } from "@/components/empty/empty-state";
import type { AlertSeverity, LearningAlertRow } from "@/lib/ai/types";
import { TOKEN_REFILL_AMOUNT } from "@/lib/trainer/constants";
import { cn } from "@/lib/utils";

type SeverityFilter = "all" | AlertSeverity;

type StudentAlertsPanelProps = {
  initialAlerts: LearningAlertRow[];
};

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  low: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
};

const FILTER_TABS: { id: SeverityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
];

export function StudentAlertsPanel({ initialAlerts }: StudentAlertsPanelProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messageFor, setMessageFor] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const unresolvedCount = alerts.length;

  const handleResolve = useCallback(
    async (alertId: string) => {
      setBusyId(alertId);
      setError(null);
      try {
        const res = await fetch("/api/trainer/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alert_id: alertId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not resolve alert");
        }
        setAlerts((current) => current.filter((a) => a.id !== alertId));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusyId(null);
      }
    },
    [router]
  );

  const handleRefill = useCallback(
    async (studentId: string) => {
      setBusyId(studentId);
      setError(null);
      try {
        const res = await fetch("/api/trainer/refill-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Refill failed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refill failed");
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const handleSendMessage = useCallback(
    async (studentId: string) => {
      if (!messageText.trim()) return;
      setBusyId(studentId);
      setError(null);
      try {
        const res = await fetch("/api/trainer/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "message",
            student_id: studentId,
            message: messageText.trim(),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not send message");
        }
        setMessageFor(null);
        setMessageText("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Message failed");
      } finally {
        setBusyId(null);
      }
    },
    [messageText]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                filter === tab.id
                  ? "border-red-500/50 bg-red-500/15 text-red-200"
                  : "border-white/10 text-muted-foreground hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {unresolvedCount > 0 && (
          <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/20">
            {unresolvedCount} alert{unresolvedCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <NoAlerts />
      ) : (
        <ul className="space-y-4">
          {filtered.map((alert) => (
            <li
              key={alert.id}
              className="rounded-xl border border-violet-500/15 bg-card/50 p-5 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10 ring-2 ring-violet-500/30">
                    {alert.studentAvatarUrl && (
                      <AvatarImage
                        src={alert.studentAvatarUrl}
                        alt={alert.studentName}
                      />
                    )}
                    <AvatarFallback className="bg-violet-500/20 text-violet-200">
                      {alert.studentName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{alert.studentName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={SEVERITY_STYLES[alert.severity]}
                      >
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {alert.alertType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {alert.message}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {alert.daysSinceLogin != null && (
                        <span>
                          Last login:{" "}
                          {alert.daysSinceLogin === 0
                            ? "today"
                            : `${alert.daysSinceLogin}d ago`}
                        </span>
                      )}
                      {alert.currentModuleTitle && (
                        <span>
                          Current: Mission {alert.currentModuleId} —{" "}
                          {alert.currentModuleTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 border-cyan-500/30"
                    disabled={busyId === alert.studentId}
                    onClick={() => {
                      setMessageFor(
                        messageFor === alert.studentId ? null : alert.studentId
                      );
                      setMessageText("");
                    }}
                  >
                    <MessageSquare className="size-3.5" aria-hidden />
                    Message
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 border-violet-500/30"
                    disabled={busyId === alert.studentId}
                    onClick={() => void handleRefill(alert.studentId)}
                  >
                    {busyId === alert.studentId ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="size-3.5" aria-hidden />
                    )}
                    Refill +{TOKEN_REFILL_AMOUNT}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 border-emerald-500/30 text-emerald-300"
                    disabled={busyId === alert.id}
                    onClick={() => void handleResolve(alert.id)}
                  >
                    {busyId === alert.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-3.5" aria-hidden />
                    )}
                    Mark Resolved
                  </Button>
                </div>
              </div>

              {messageFor === alert.studentId && (
                <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Write a message to this student…"
                    className="flex-1 rounded-lg border border-violet-500/20 bg-black/40 px-3 py-2 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!messageText.trim() || busyId === alert.studentId}
                    onClick={() => void handleSendMessage(alert.studentId)}
                  >
                    Send
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StudentAlertsHeaderBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-300">
      <AlertTriangle className="size-3" aria-hidden />
      {count}
    </span>
  );
}
