import { auth } from "@clerk/nextjs/server";

import {
  createTrainerNote,
  deleteTrainerNote,
  fetchTrainerNotes,
} from "@/lib/trainer/student-detail";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("student_id");
  if (!studentId) {
    return Response.json({ error: "student_id required" }, { status: 400 });
  }

  const notes = await fetchTrainerNotes(studentId);
  return Response.json({ notes });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    student_id?: string;
    note?: string;
    note_type?: "general" | "concern" | "achievement" | "reminder";
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.student_id || !body.note?.trim()) {
    return Response.json(
      { error: "student_id and note are required" },
      { status: 400 }
    );
  }

  const result = await createTrainerNote({
    trainerId: userId,
    studentId: body.student_id,
    note: body.note,
    noteType: body.note_type ?? "general",
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ note: result.note });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("id");
  if (!noteId) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const result = await deleteTrainerNote(noteId, userId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ ok: true });
}
