import { auth } from "@clerk/nextjs/server";

import {
  checkSessionHealth,
  endSession,
  getTodayLearningMinutes,
  startSession,
  updateSession,
} from "@/lib/safety/session-tracker";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (sessionId) {
    const health = await checkSessionHealth(sessionId);
    return Response.json({ health });
  }

  const todayMinutes = await getTodayLearningMinutes(userId);
  return Response.json({ todayMinutes });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: "start" | "update" | "end" | "health";
    session_id?: string;
    active_minutes?: number;
    idle_minutes?: number;
    page?: string;
    increment_action?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const sessionId = await startSession(userId);
    return Response.json({ session_id: sessionId });
  }

  if (!body.session_id) {
    return Response.json({ error: "session_id required" }, { status: 400 });
  }

  if (body.action === "update") {
    await updateSession(body.session_id, {
      activeMinutes: body.active_minutes,
      idleMinutes: body.idle_minutes,
      page: body.page,
      action: body.increment_action,
    });
    return Response.json({ success: true });
  }

  if (body.action === "end") {
    await endSession(body.session_id);
    return Response.json({ success: true });
  }

  if (body.action === "health") {
    const health = await checkSessionHealth(body.session_id);
    return Response.json({ health });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
