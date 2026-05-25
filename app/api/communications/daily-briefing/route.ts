import { auth } from "@clerk/nextjs/server";

import {
  completeDailyBriefing,
  generateDailyBriefing,
  getTodayBriefing,
  skipDailyBriefing,
} from "@/lib/communications/briefing-generator";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let briefing = await getTodayBriefing(userId);
  if (!briefing) {
    briefing = await generateDailyBriefing(userId);
  }

  return Response.json({ briefing });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: "generate" | "complete" | "skip"; briefing_id?: string } =
    {};
  try {
    body = await req.json();
  } catch {
    body = { action: "generate" };
  }

  if (body.action === "complete" && body.briefing_id) {
    const result = await completeDailyBriefing(userId, body.briefing_id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true, xp: result.xp });
  }

  if (body.action === "skip" && body.briefing_id) {
    const result = await skipDailyBriefing(userId, body.briefing_id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  const briefing = await generateDailyBriefing(userId);
  return Response.json({ briefing });
}
