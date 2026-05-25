import {
  archiveAdminCohort,
  createAdminCohort,
  fetchAdminCohorts,
  updateAdminCohort,
} from "@/lib/admin/cohorts";
import { requireAdminContext } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const data = await fetchAdminCohorts();
  return Response.json(data);
}

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    name?: string;
    startDate?: string | null;
    trainerId?: string | null;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return Response.json({ error: "name required" }, { status: 400 });
  }

  const result = await createAdminCohort({
    name: body.name,
    startDate: body.startDate ?? null,
    trainerId: body.trainerId ?? null,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ id: result.id });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    cohortId?: string;
    name?: string;
    startDate?: string | null;
    trainerId?: string | null;
  } = {};

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.cohortId) {
    return Response.json({ error: "cohortId required" }, { status: 400 });
  }

  const result = await updateAdminCohort({
    cohortId: body.cohortId,
    name: body.name,
    startDate: body.startDate,
    trainerId: body.trainerId,
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
  const cohortId = searchParams.get("cohort_id");

  if (!cohortId) {
    return Response.json({ error: "cohort_id required" }, { status: 400 });
  }

  const result = await archiveAdminCohort(cohortId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}
