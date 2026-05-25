import { auth } from "@clerk/nextjs/server";

import { getAssemblyHelp } from "@/lib/hardware/assembly-guide";
import { filterAIResponse } from "@/lib/safety/age-filter";
import { deductAiToken, getTokenBalance } from "@/lib/tokens/deduct";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { module_id?: number; question?: string; skip_token?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { module_id, question, skip_token } = body;

  if (!module_id || !question?.trim()) {
    return Response.json(
      { error: "module_id and question are required" },
      { status: 400 }
    );
  }

  if (!skip_token) {
    const balance = await getTokenBalance(userId);
    if (balance <= 0) {
      return Response.json(
        { error: "No tokens remaining", remaining: 0 },
        { status: 402 }
      );
    }

    const deduction = await deductAiToken(
      userId,
      true,
      "assembly_guide",
      module_id
    );
    if (!deduction.ok) {
      return Response.json(
        { error: "Insufficient tokens", remaining: deduction.remaining },
        { status: 402 }
      );
    }
  }

  const help = await getAssemblyHelp(module_id, question.trim(), userId);
  help.answer = filterAIResponse(help.answer);
  const remaining = await getTokenBalance(userId);

  return Response.json({ help, remaining_tokens: remaining });
}
