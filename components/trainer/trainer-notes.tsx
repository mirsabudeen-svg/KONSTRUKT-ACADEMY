"use client";

import { useCallback, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TrainerNoteRow } from "@/lib/trainer/student-detail";
import { cn } from "@/lib/utils";

const NOTE_TYPES = [
  { id: "general" as const, label: "General", emoji: "📋" },
  { id: "concern" as const, label: "Concern", emoji: "⚠️" },
  { id: "achievement" as const, label: "Achievement", emoji: "🏆" },
  { id: "reminder" as const, label: "Reminder", emoji: "🔔" },
];

type TrainerNotesProps = {
  studentId: string;
  initialNotes?: TrainerNoteRow[];
  compact?: boolean;
};

export function TrainerNotes({
  studentId,
  initialNotes = [],
  compact = false,
}: TrainerNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [noteType, setNoteType] =
    useState<TrainerNoteRow["noteType"]>("general");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/trainer/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          note: content.trim(),
          note_type: noteType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      setNotes((current) => [data.note, ...current]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [content, noteType, studentId]);

  const handleDelete = useCallback(async (noteId: string) => {
    setDeletingId(noteId);
    try {
      const res = await fetch(`/api/trainer/notes?id=${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setNotes((current) => current.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
          Trainer Notes
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {NOTE_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setNoteType(type.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                noteType === type.id
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                  : "border-white/10 text-muted-foreground hover:bg-white/5"
              )}
            >
              {type.emoji} {type.label}
            </button>
          ))}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={compact ? 2 : 3}
          placeholder="Add a private trainer note…"
          className="mt-2 border-violet-500/20 bg-black/30 text-sm"
        />
        <Button
          type="button"
          size="sm"
          className="mt-2"
          disabled={saving || !content.trim()}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Save note"
          )}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((note) => {
            const typeMeta = NOTE_TYPES.find((t) => t.id === note.noteType);
            return (
              <li
                key={note.id}
                className="group flex items-start justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {typeMeta?.emoji} {typeMeta?.label} ·{" "}
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm">{note.note}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100"
                  disabled={deletingId === note.id}
                  onClick={() => void handleDelete(note.id)}
                  aria-label="Delete note"
                >
                  {deletingId === note.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
