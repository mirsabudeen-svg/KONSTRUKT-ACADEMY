import { chatWithARIA } from "@/lib/aria/aria-engine";
import { requireAdminContext } from "@/lib/auth/admin";
import type { AriaContextType } from "@/lib/aria/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 }
    );
  }

  let body: {
    message?: string;
    conversation_id?: string;
    context_type?: AriaContextType;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const result = await chatWithARIA({
    adminId: ctx.userId,
    message,
    conversationId: body.conversation_id,
    contextType: body.context_type,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Conversation-Id": result.conversationId,
    },
  });
}
