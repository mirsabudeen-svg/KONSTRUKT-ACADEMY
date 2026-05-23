"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PRINT_QUEUE_COLUMNS,
  type PrintQueueKanbanItem,
  type PrintQueueStatus,
} from "@/lib/trainer/constants";
import { cn } from "@/lib/utils";

type PrintQueueKanbanProps = {
  initialItems: PrintQueueKanbanItem[];
};

export function PrintQueueKanban({ initialItems }: PrintQueueKanbanProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (id: string, status: PrintQueueStatus) => {
      setUpdatingId(id);
      const previous = items;

      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );

      try {
        const res = await fetch("/api/trainer/print-queue", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Update failed");
        }

        router.refresh();
      } catch (err) {
        setItems(previous);
        console.error(err);
      } finally {
        setUpdatingId(null);
        setDraggingId(null);
      }
    },
    [items, router]
  );

  const onDrop = (status: PrintQueueStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (item && item.status !== status) {
      void updateStatus(id, status);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {PRINT_QUEUE_COLUMNS.map((column) => {
        const columnItems = items.filter((i) => i.status === column.status);

        return (
          <div
            key={column.status}
            className={cn(
              "flex min-h-[320px] flex-col rounded-xl border p-3",
              column.accent
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop(column.status)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
                {column.label}
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {columnItems.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {columnItems.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                  Drop jobs here
                </p>
              ) : (
                columnItems.map((item) => (
                  <PrintQueueCard
                    key={item.id}
                    item={item}
                    dragging={draggingId === item.id}
                    updating={updatingId === item.id}
                    onDragStart={() => setDraggingId(item.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onStatusChange={(status) => updateStatus(item.id, status)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrintQueueCard({
  item,
  dragging,
  updating,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: {
  item: PrintQueueKanbanItem;
  dragging: boolean;
  updating: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onStatusChange: (status: PrintQueueStatus) => void;
}) {
  return (
    <article
      draggable={!updating}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-lg border border-white/10 bg-black/40 p-3 active:cursor-grabbing",
        dragging && "opacity-50 ring-2 ring-violet-500/40",
        updating && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{item.studentName}</p>
          {item.studentEmail && (
            <p className="truncate text-[10px] text-muted-foreground">
              {item.studentEmail}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-cyan-400/80">
            <Printer className="size-3" aria-hidden />
            {item.printerAssigned.replace(/_/g, " ")}
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {PRINT_QUEUE_COLUMNS.filter((c) => c.status !== item.status).map(
          (col) => (
            <Button
              key={col.status}
              type="button"
              variant="outline"
              size="xs"
              className="h-6 px-2 text-[10px]"
              disabled={updating}
              onClick={() => onStatusChange(col.status)}
            >
              → {col.label}
            </Button>
          )
        )}
      </div>
    </article>
  );
}
