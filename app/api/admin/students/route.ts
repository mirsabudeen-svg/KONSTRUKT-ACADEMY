import {
  bulkDeleteStudents,
  bulkUpdateStudentCohort,
  deleteAdminStudent,
  fetchAdminStudents,
  updateAdminStudent,
} from "@/lib/admin/students";
import { rowsToCsv } from "@/lib/admin/csv";
import { requireAdminContext } from "@/lib/auth/admin";
import type { UserRole } from "@/lib/db/types";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const data = await fetchAdminStudents();
  return Response.json(data);
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    studentId?: string;
    studentIds?: string[];
    cohortId?: string | null;
    role?: UserRole;
    bulkAction?: "move_cohort";
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.bulkAction === "move_cohort" && body.studentIds?.length) {
    const result = await bulkUpdateStudentCohort(
      body.studentIds,
      body.cohortId ?? null
    );
    return Response.json(result);
  }

  if (!body.studentId) {
    return Response.json({ error: "studentId required" }, { status: 400 });
  }

  const result = await updateAdminStudent({
    studentId: body.studentId,
    cohortId: body.cohortId,
    role: body.role,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("student_id");
  const bulkIds = searchParams.get("ids")?.split(",").filter(Boolean);

  if (bulkIds?.length) {
    const result = await bulkDeleteStudents(bulkIds);
    return Response.json(result);
  }

  if (!studentId) {
    return Response.json({ error: "student_id required" }, { status: 400 });
  }

  const result = await deleteAdminStudent(studentId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { action?: string; studentIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "export_csv" && body.studentIds?.length) {
    const data = await fetchAdminStudents();
    const selected = data.students.filter((s) =>
      body.studentIds!.includes(s.id)
    );
    const csv = rowsToCsv(
      [
        "Name",
        "Email",
        "Cohort",
        "Modules Done",
        "Avg Score",
        "XP",
        "Level",
        "Tokens",
        "Risk",
      ],
      selected.map((s) => [
        s.name,
        s.email,
        s.cohortName,
        `${s.modulesDone}/${s.modulesTotal}`,
        s.averageScore,
        s.totalXp,
        s.level,
        s.tokensRemaining,
        s.riskLevel,
      ])
    );
    return Response.json({ csv, filename: "students-export.csv" });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
