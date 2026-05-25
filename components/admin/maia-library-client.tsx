"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ContentItem = {
  id: string;
  title: string | null;
  content_type: string;
  platform: string | null;
  content: string;
  status: string;
  performance_notes: string | null;
  created_at: string;
  admin_id: string | null;
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "social_post", label: "Social" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ad_copy", label: "Ads" },
];

const STATUS_FILTERS = ["all", "draft", "approved", "published"];

function typeIcon(type: string) {
  if (type === "social_post") return "📱";
  if (type === "email") return "📧";
  if (type === "whatsapp") return "💬";
  if (type === "ad_copy") return "📊";
  return "📄";
}

export function MaiaLibraryClient() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("content_type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/admin/maia/content?${params}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditDraft(selected.content);
    }
  }, [selected]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/maia/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
    if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
  }

  async function saveEdit() {
    if (!selected) return;
    await fetch("/api/admin/maia/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, content: editDraft }),
    });
    void load();
    setSelected((s) => (s ? { ...s, content: editDraft } : s));
  }

  async function deleteItem(id: string) {
    await fetch(`/api/admin/maia/content?id=${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/maia"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-300"
        >
          <ArrowLeft className="size-3" />
          Back to MAIA
        </Link>
        <h1 className="font-display text-2xl font-bold text-orange-300">
          📚 Content Library
        </h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs border-orange-500/20"
        />
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={typeFilter === f.value ? "default" : "outline"}
              size="xs"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="xs"
              className="capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="xs" onClick={() => void load()}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className={cn(
                "w-full rounded-xl border border-orange-500/15 p-4 text-left transition-colors hover:bg-orange-500/5",
                selected?.id === item.id && "ring-1 ring-orange-500/40"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span>{typeIcon(item.content_type)}</span>
                <span className="font-medium text-orange-200">
                  {item.title ?? item.content_type}
                </span>
                <Badge variant="outline" className="ml-auto capitalize">
                  {item.status}
                </Badge>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.content.slice(0, 100)}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {item.platform} · {new Date(item.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">No content found</p>
          )}
        </div>

        {selected && (
          <div className="rounded-xl border border-orange-500/15 bg-sidebar/40 p-4">
            <h2 className="mb-3 font-display text-sm font-semibold text-orange-300">
              Content Detail
            </h2>
            <Textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={12}
              className="mb-3 border-orange-500/20"
            />
            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="xs" onClick={() => void saveEdit()}>
                Save
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(editDraft);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                Copy
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => void updateStatus(selected.id, "approved")}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => void updateStatus(selected.id, "published")}
              >
                Publish
              </Button>
              <Button
                variant="destructive"
                size="xs"
                onClick={() => void deleteItem(selected.id)}
              >
                <Trash2 className="size-3" />
                Delete
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {new Date(selected.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
