import { chatWithMAIA, generateCampaignPlan } from "@/lib/maia/maia-engine";
import { requireAdminContext } from "@/lib/auth/admin";

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
    campaign_type?: string;
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

  const result = await chatWithMAIA({
    adminId: ctx.userId,
    message,
    conversationId: body.conversation_id,
    campaignType: body.campaign_type,
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

export async function PUT(req: Request) {
  const ctx = await requireAdminContext();
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: {
    name?: string;
    goal?: string;
    target_audience?: string;
    channels?: string[];
    start_date?: string;
    end_date?: string;
    budget?: number;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.goal || !body.target_audience || !body.channels?.length) {
    return Response.json(
      { error: "name, goal, target_audience, and channels are required" },
      { status: 400 }
    );
  }

  const result = await generateCampaignPlan({
    adminId: ctx.userId,
    name: body.name,
    goal: body.goal,
    targetAudience: body.target_audience,
    channels: body.channels,
    startDate: body.start_date,
    endDate: body.end_date,
    budget: body.budget,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json(result);
}
