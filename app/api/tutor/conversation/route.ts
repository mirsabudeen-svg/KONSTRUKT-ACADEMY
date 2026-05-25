import { auth } from "@clerk/nextjs/server";

import {
  clearConversation,
  loadLatestConversation,
} from "@/lib/tutor/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const moduleId = Number(searchParams.get("module_id"));

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    return Response.json({ error: "Invalid module_id" }, { status: 400 });
  }

  const data = await loadLatestConversation(userId, moduleId);

  return Response.json({
    conversation_id: data.conversationId,
    messages: data.messages,
  });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversation_id");

  if (!conversationId) {
    return Response.json({ error: "conversation_id required" }, { status: 400 });
  }

  const result = await clearConversation(userId, conversationId);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 404 });
  }

  return Response.json({ ok: true });
}
