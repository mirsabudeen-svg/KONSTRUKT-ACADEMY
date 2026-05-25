import { auth } from "@clerk/nextjs/server";

import { checkAndSendHints } from "@/lib/ai/proactive-hints";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ sent: 0, skipped: "no_api_key" });
  }

  try {
    const result = await checkAndSendHints();
    return Response.json(result);
  } catch (err) {
    console.error("[check-hints]", err);
    return Response.json({ error: "Hint check failed" }, { status: 500 });
  }
}
