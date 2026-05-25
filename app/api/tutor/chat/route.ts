import { auth } from "@clerk/nextjs/server";

import {
  appendHardwareReminderIfCodeQuestion,
  sanitizeUserMessage,
} from "@/lib/tutor/constraints";
import { scanTutorMessage } from "@/lib/safety/content-monitor";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  userRateLimitKey,
} from "@/lib/rate-limit";
import { streamTutorChat } from "@/lib/tutor/service";
import type { TutorChatRequest } from "@/lib/tutor/types";
import { ensureStudentProfile } from "@/lib/user";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
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

  let body: TutorChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const moduleId = Number(body.module_id);
  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 10) {
    return Response.json({ error: "Invalid module_id" }, { status: 400 });
  }

  const sanitized = sanitizeUserMessage(body.message ?? "");
  if (!sanitized.ok) {
    return Response.json({ error: sanitized.reason }, { status: 400 });
  }

  await ensureStudentProfile(userId);

  const rl = checkRateLimit(
    userRateLimitKey(userId, "tutor-chat"),
    RATE_LIMITS.tutorChat.limit,
    RATE_LIMITS.tutorChat.windowMs
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const scan = await scanTutorMessage(
    userId,
    sanitized.text,
    body.conversation_id
  );

  if (scan.action === "block" || scan.action === "alert_trainer") {
    return Response.json(
      {
        error:
          scan.blockMessage ??
          "I can only help with robotics questions. Let's keep our chat focused on your mission!",
      },
      { status: 403 }
    );
  }

  const userMessage = appendHardwareReminderIfCodeQuestion(sanitized.text);

  const result = await streamTutorChat({
    studentId: userId,
    moduleId,
    userMessage,
    conversationId: body.conversation_id,
    safetyNote: scan.safetyNote,
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
