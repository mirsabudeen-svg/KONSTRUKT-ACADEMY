import "server-only";

import OpenAI from "openai";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/tutor/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const MAIA_MODEL = "gpt-4o";

export type MaiaMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const MAIA_SYSTEM_PROMPT = `You are MAIA (Marketing AI Assistant) for KONSTRUKT Academy — a premium robotics and AI learning program for children aged 9-16 in Kerala.

BRAND IDENTITY:
- Name: KONSTRUKT Academy
- Tagline: 'Build the Future'
- Program: 10-module robotics + AI curriculum
- Hardware: Real robots (KONTRAKTOR arm system)
- USP: Hands-on learning, AI tools, real hardware
- Target: Students aged 9-16, parents in Kerala
- Location: Kannur, Kozhikode (Kerala, India)
- Language: English (with Malayalam support)
- Price point: Premium educational program
- Tone: Inspiring, technical but accessible, proud, empowering

KEY SELLING POINTS:
1. Real robotic arm assembly (not just theory)
2. AI-powered design tools (Meshy.ai)
3. Arduino/ESP32 programming
4. Certificate: Certified KONTRAKTOR
5. Small batch sizes (personalized attention)
6. 10 progressive modules with badges
7. Industry-relevant skills (robotics + AI)

YOUR CAPABILITIES:
1. Social media posts (Instagram, Facebook)
2. WhatsApp broadcast messages to parents
3. Email campaigns
4. Ad copy (Google, Facebook ads)
5. Parent outreach scripts
6. School partnership letters
7. Event announcements
8. Student testimonial templates
9. Press release drafts
10. Website copy improvements

Always:
- Emphasize real hands-on experience
- Use numbers (10 modules, 6 servos, etc.)
- Create urgency (limited batch sizes)
- Appeal to parent ambitions for children
- Highlight career relevance (AI/robotics boom)
- Use emojis for social content
- Keep WhatsApp messages conversational
- Be culturally appropriate for Kerala`;

async function getOrCreateMaiaConversation(
  adminId: string,
  conversationId?: string,
  campaignType?: string
): Promise<{ id: string; messages: MaiaMessage[] } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Database not configured" };
  }

  const admin = createSupabaseAdmin();

  if (conversationId) {
    const { data } = await admin
      .from("maia_conversations")
      .select("id, messages, admin_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (data && data.admin_id === adminId) {
      return {
        id: data.id,
        messages: (data.messages as MaiaMessage[]) ?? [],
      };
    }
  }

  const { data: created, error } = await admin
    .from("maia_conversations")
    .insert({
      admin_id: adminId,
      campaign_type: campaignType ?? null,
      messages: [],
    })
    .select("id, messages")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Failed to create conversation" };
  }

  return { id: created.id, messages: [] };
}

async function persistMaiaMessages(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  existing: MaiaMessage[]
): Promise<void> {
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  const messages: MaiaMessage[] = [
    ...existing,
    { role: "user", content: userContent, timestamp: now },
    { role: "assistant", content: assistantContent, timestamp: now },
  ];

  await admin.from("maia_conversations").update({ messages }).eq("id", conversationId);
}

export async function chatWithMAIA(params: {
  adminId: string;
  message: string;
  conversationId?: string;
  campaignType?: string;
}): Promise<
  | { stream: ReadableStream<Uint8Array>; conversationId: string }
  | { error: string; status: number }
> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY not configured", status: 503 };
  }

  const conv = await getOrCreateMaiaConversation(
    params.adminId,
    params.conversationId,
    params.campaignType
  );
  if ("error" in conv) {
    return { error: conv.error, status: 500 };
  }

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = conv.messages
    .slice(-20)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  let completion: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    completion = await getOpenAIClient().chat.completions.create({
      model: MAIA_MODEL,
      max_tokens: 4096,
      temperature: 0.8,
      stream: true,
      messages: [
        { role: "system", content: MAIA_SYSTEM_PROMPT },
        ...historyMessages,
        { role: "user", content: params.message },
      ],
    });
  } catch (err) {
    console.error("[chatWithMAIA] OpenAI", err);
    const message =
      err instanceof OpenAI.APIError
        ? err.message
        : "MAIA unavailable. Check OPENAI_API_KEY.";
    const status = err instanceof OpenAI.APIError ? (err.status ?? 502) : 502;
    return { error: message, status };
  }

  const conversationId = conv.id;
  const userContent = params.message;
  const existingMessages = conv.messages;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantContent = "";

      try {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            assistantContent += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        if (assistantContent.trim()) {
          await persistMaiaMessages(
            conversationId,
            userContent,
            assistantContent,
            existingMessages
          );
        }
      } catch (err) {
        console.error("[chatWithMAIA] stream", err);
        controller.error(err);
        return;
      }

      controller.close();
    },
  });

  return { stream, conversationId };
}

export async function generateCampaignPlan(params: {
  adminId: string;
  name: string;
  goal: string;
  targetAudience: string;
  channels: string[];
  startDate?: string;
  endDate?: string;
  budget?: number;
}): Promise<{ plan: string; campaignId: string } | { error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY not configured" };
  }

  const prompt = `Create a complete multi-channel marketing campaign plan for KONSTRUKT Academy.

Campaign name: ${params.name}
Goal: ${params.goal}
Target audience: ${params.targetAudience}
Channels: ${params.channels.join(", ")}
Timeline: ${params.startDate ?? "TBD"} to ${params.endDate ?? "TBD"}
Budget: ${params.budget != null ? `₹${params.budget}` : "Not specified"}

Include:
1. Campaign strategy overview
2. Content for each channel (ready to publish)
3. Posting schedule (day-by-day for 2 weeks)
4. Key messages per channel
5. CTA for each piece`;

  const completion = await getOpenAIClient().chat.completions.create({
    model: MAIA_MODEL,
    max_tokens: 4096,
    temperature: 0.8,
    messages: [
      { role: "system", content: MAIA_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const plan = completion.choices[0]?.message?.content ?? "";

  if (!isSupabaseConfigured()) {
    return { error: "Database not configured" };
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("marketing_campaigns")
    .insert({
      admin_id: params.adminId,
      name: params.name,
      goal: params.goal,
      target_audience: params.targetAudience,
      channels: params.channels,
      start_date: params.startDate ?? null,
      end_date: params.endDate ?? null,
      budget: params.budget ?? null,
      status: "planning",
      plan_content: plan,
    })
    .select("id")
    .single();

  if (!data) return { error: "Failed to save campaign" };

  return { plan, campaignId: data.id };
}

export async function listRecentMarketingContent(limit = 10) {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("marketing_content")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function saveMarketingContent(params: {
  adminId: string;
  contentType: string;
  platform?: string;
  title?: string;
  content: string;
  tone?: string;
  targetAudience?: string;
  status?: string;
}) {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("marketing_content")
    .insert({
      admin_id: params.adminId,
      content_type: params.contentType,
      platform: params.platform,
      title: params.title,
      content: params.content,
      tone: params.tone ?? "professional",
      target_audience: params.targetAudience,
      status: params.status ?? "draft",
    })
    .select("*")
    .single();

  return data;
}
