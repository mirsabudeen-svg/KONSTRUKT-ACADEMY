import { auth } from "@clerk/nextjs/server";

import { reviewCode } from "@/lib/ai/code-reviewer";

type RouteParams = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const moduleId = Number(id);
  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  if (!code) {
    return Response.json({ error: "Code is required" }, { status: 400 });
  }

  try {
    const { review, summary } = await reviewCode(
      null,
      code,
      moduleId,
      userId,
      { persist: false }
    );
    return Response.json({ review, summary });
  } catch (err) {
    console.error("[pre-review]", err);
    return Response.json({ error: "Pre-review failed" }, { status: 500 });
  }
}
