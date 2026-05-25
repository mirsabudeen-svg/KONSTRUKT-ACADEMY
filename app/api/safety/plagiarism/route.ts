import { auth } from "@clerk/nextjs/server";

import {
  checkPlagiarism,
  fetchPlagiarismCheck,
} from "@/lib/safety/plagiarism-detector";
import { requireTrainerContext } from "@/lib/supabase/trainer-actions";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const submissionId = url.searchParams.get("submission_id");

  if (!submissionId) {
    return Response.json(
      { error: "submission_id is required" },
      { status: 400 }
    );
  }

  const check = await fetchPlagiarismCheck(submissionId);
  return Response.json({ check });
}

export async function POST(req: Request) {
  const ctx = await requireTrainerContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    submission_id?: string;
    code?: string;
    module_id?: number;
    student_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { submission_id, code, module_id, student_id } = body;

  if (!submission_id || !code || !module_id || !student_id) {
    return Response.json(
      { error: "submission_id, code, module_id, student_id required" },
      { status: 400 }
    );
  }

  const check = await checkPlagiarism(
    submission_id,
    code,
    module_id,
    student_id
  );

  return Response.json({ check });
}
