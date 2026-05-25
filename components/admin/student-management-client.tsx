"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";

import type { AdminStudentRow, AdminStudentsData } from "@/lib/admin/students";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/db/types";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function riskBadge(level: AdminStudentRow["riskLevel"]) {
  if (level === "critical")
    return <Badge className="bg-red-500/20 text-red-300">Critical</Badge>;
  if (level === "at_risk")
    return <Badge className="bg-amber-500/20 text-amber-300">At Risk</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-300">On Track</Badge>;
}

export function StudentManagementClient() {
  const [data, setData] = useState<AdminStudentsData | null>(null);
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<
    "name" | "xp" | "progress" | "lastLogin"
  >("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCohort, setBulkCohort] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/students");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = data?.students ?? [];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.email?.toLowerCase().includes(q) ?? false)
      );
    }

    if (cohortFilter !== "all") {
      rows = rows.filter((s) => s.cohortId === cohortFilter);
    }

    if (roleFilter !== "all") {
      rows = rows.filter((s) => s.role === roleFilter);
    }

    rows = [...rows].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "xp") return b.totalXp - a.totalXp;
      if (sortBy === "progress") return b.modulesDone - a.modulesDone;
      const aDate = a.lastLogin ?? "";
      const bDate = b.lastLogin ?? "";
      return bDate.localeCompare(aDate);
    });

    return rows;
  }, [data, search, cohortFilter, roleFilter, sortBy]);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function updateCohort(studentId: string, cohortId: string | null) {
    await fetch("/api/admin/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, cohortId: cohortId || null }),
    });
    await load();
  }

  async function deleteStudent(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await fetch(`/api/admin/students?student_id=${id}`, { method: "DELETE" });
    await load();
  }

  async function bulkMoveCohort() {
    if (!bulkCohort || selected.size === 0) return;
    await fetch("/api/admin/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulkAction: "move_cohort",
        studentIds: [...selected],
        cohortId: bulkCohort,
      }),
    });
    setSelected(new Set());
    await load();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} users?`)) return;
    await fetch(
      `/api/admin/students?ids=${[...selected].join(",")}`,
      { method: "DELETE" }
    );
    setSelected(new Set());
    await load();
  }

  async function bulkExport() {
    if (selected.size === 0) return;
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "export_csv",
        studentIds: [...selected],
      }),
    });
    if (res.ok) {
      const { csv, filename } = await res.json();
      downloadCsv(csv, filename);
    }
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-orange-300">
          Student Management
        </h1>
        {summary && (
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.total} students · {summary.onTrack} on track ·{" "}
            {summary.atRisk} at risk · {summary.critical} critical
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-orange-500/20 bg-background/50 py-2 pl-10 pr-3 text-sm outline-none focus:border-orange-500/50"
          />
        </div>
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
        >
          <option value="all">All Cohorts</option>
          {(data?.cohorts ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          className="rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="trainer">Trainers</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as typeof sortBy)
          }
          className="rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="xp">Sort: XP</option>
          <option value="progress">Sort: Progress</option>
          <option value="lastLogin">Sort: Last Login</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
          <span className="text-sm text-orange-200">{selected.size} selected</span>
          <select
            value={bulkCohort}
            onChange={(e) => setBulkCohort(e.target.value)}
            className="rounded border border-orange-500/20 bg-background px-2 py-1 text-sm"
          >
            <option value="">Move to cohort…</option>
            {(data?.cohorts ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => void bulkMoveCohort()}>
            Move
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulkExport()}>
            <Download className="mr-1 size-3" />
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-400"
            onClick={() => void bulkDelete()}
          >
            Delete
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-orange-500/15">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-orange-500/15 bg-orange-500/5 text-[10px] uppercase tracking-wider text-orange-300">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selected.size === filtered.length
                  }
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3">Cohort</th>
              <th className="px-3 py-3">Modules</th>
              <th className="px-3 py-3">Avg Score</th>
              <th className="px-3 py-3">XP</th>
              <th className="px-3 py-3">Tokens</th>
              <th className="px-3 py-3">Last Login</th>
              <th className="px-3 py-3">Risk</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr
                key={student.id}
                className="border-b border-orange-500/10 hover:bg-orange-500/5"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(student.id)}
                    onChange={() => toggleOne(student.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 ring-1 ring-orange-500/30">
                      {student.imageUrl ? (
                        <AvatarImage src={student.imageUrl} alt={student.name} />
                      ) : null}
                      <AvatarFallback className="bg-orange-500/20 text-xs">
                        {student.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {student.email ?? student.role}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={student.cohortId ?? ""}
                    onChange={(e) =>
                      void updateCohort(student.id, e.target.value || null)
                    }
                    className="max-w-[140px] rounded border border-orange-500/20 bg-transparent px-1 py-0.5 text-xs"
                  >
                    <option value="">None</option>
                    {(data?.cohorts ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {student.modulesDone}/{student.modulesTotal}
                </td>
                <td className="px-3 py-2">{student.averageScore || "—"}</td>
                <td className="px-3 py-2">
                  {student.totalXp}
                  <span className="block text-[10px] text-muted-foreground">
                    {student.level}
                  </span>
                </td>
                <td className="px-3 py-2">{student.tokensRemaining}</td>
                <td className="px-3 py-2">
                  {student.lastLogin ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {student.role === "student"
                    ? riskBadge(student.riskLevel)
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-red-400"
                      onClick={() => void deleteStudent(student.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
