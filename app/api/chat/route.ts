import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { anthropic, CHAT_MODEL, configureUndiciProxy } from "@/lib/ai/anthropic";
import { KONSTRUKT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { ensureStudentProfile } from "@/lib/user";
import { deductAiToken } from "@/lib/tokens/deduct";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  await configureUndiciProxy();

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  await ensureStudentProfile(userId);

  const deduction = await deductAiToken(userId);
  if (!deduction.ok) {
    const status =
      deduction.reason === "unconfigured" ? 503 : 402;
    return Response.json(
      {
        error: "INSUFFICIENT_TOKENS",
        message: "Tokens depleted. Request a refill from your Trainer.",
        tokensRemaining: deduction.remaining,
      },
      { status }
    );
  }

  let body: { messages: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages)) {
    return Response.json({ error: "messages array required" }, { status: 400 });
  }

  const result = streamText({
    model: anthropic(CHAT_MODEL),
    system: KONSTRUKT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Tokens-Remaining": String(deduction.remaining),
    },
  });
}
