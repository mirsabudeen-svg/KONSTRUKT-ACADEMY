"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TrainerStudentRow } from "@/lib/trainer/constants";
import { TOKEN_REFILL_AMOUNT } from "@/lib/trainer/constants";
import { cn } from "@/lib/utils";

type StudentManagementListProps = {
  initialStudents: TrainerStudentRow[];
};

export function StudentManagementList({
  initialStudents,
}: StudentManagementListProps) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [refillingId, setRefillingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefill = async (studentId: string) => {
    setRefillingId(studentId);
    setMessage(null);

    try {
      const res = await fetch("/api/trainer/refill-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Refill failed");
      }

      setStudents((current) =>
        current.map((s) =>
          s.id === studentId
            ? { ...s, tokensRemaining: data.tokensRemaining }
            : s
        )
      );
      setMessage(`Added ${data.added} tokens successfully.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Refill failed");
    } finally {
      setRefillingId(null);
    }
  };

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-violet-500/25 py-16 text-center">
        <Users className="size-10 text-violet-500/40" aria-hidden />
        <p className="mt-4 font-display text-muted-foreground">
          No students in your cohort yet
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Assign students to a cohort in Supabase, or sign in as admin to see all
          cadets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            message.includes("success")
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-red-500/30 bg-red-500/10 text-red-300"
          )}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-violet-500/20">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-violet-500/15 bg-violet-500/5">
              <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-violet-300">
                Cadet
              </th>
              <th className="hidden px-4 py-3 font-display text-xs uppercase tracking-wider text-violet-300 sm:table-cell">
                Email
              </th>
              <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-violet-300">
                AI Tokens
              </th>
              <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wider text-violet-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{student.displayName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {student.id.slice(0, 16)}…
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {student.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs",
                      student.tokensRemaining <= 0
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    )}
                  >
                    <Sparkles className="size-3" aria-hidden />
                    {student.tokensRemaining}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-violet-500/30 hover:bg-violet-500/10"
                    disabled={refillingId === student.id}
                    onClick={() => handleRefill(student.id)}
                  >
                    {refillingId === student.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="size-3.5" aria-hidden />
                    )}
                    Refill +{TOKEN_REFILL_AMOUNT}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
