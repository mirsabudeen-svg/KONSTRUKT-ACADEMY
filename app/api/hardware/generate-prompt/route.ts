import { auth } from "@clerk/nextjs/server";

import { buildOptimizedPrompt } from "@/lib/hardware/design-validator";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    what?: string;
    style?: string;
    details?: string;
    module_id?: number;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { what, style, details, module_id } = body;

  if (!what?.trim() || !module_id) {
    return Response.json(
      { error: "what and module_id are required" },
      { status: 400 }
    );
  }

  const result = await buildOptimizedPrompt({
    what: what.trim(),
    style: style?.trim() ?? "mechanical",
    details: details?.trim() ?? "",
    moduleId: module_id,
  });

  return Response.json({
    prompt: result.prompt,
    token_cost: result.tokenCost,
    warnings: result.warnings,
  });
}
