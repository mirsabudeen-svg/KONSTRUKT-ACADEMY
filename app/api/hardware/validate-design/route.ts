import { auth } from "@clerk/nextjs/server";

import { validateSTLSubmission } from "@/lib/hardware/design-validator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { file_url?: string; module_id?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { file_url, module_id } = body;

  if (!file_url || !module_id) {
    return Response.json(
      { error: "file_url and module_id are required" },
      { status: 400 }
    );
  }

  const result = await validateSTLSubmission(file_url, module_id, userId);
  return Response.json({ validation: result });
}
