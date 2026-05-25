import "server-only";

import OpenAI from "openai";

import { gatherSystemContext } from "@/lib/aria/system-context";
import type { AriaContextType, AriaMessage } from "@/lib/aria/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/tutor/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const ARIA_MODEL = "gpt-4o";

function buildAriaSystemPrompt(contextJson: string): string {
  return `You are ARIA (Academy Robotics Intelligence Assistant), the AI system administrator for KONSTRUKT Academy LMS.

You have deep knowledge of:
- Next.js 16 + TypeScript architecture
- Supabase PostgreSQL + RLS policies
- Clerk authentication system
- OpenAI API integration
- Vercel deployment platform
- The KONSTRUKT Academy codebase

CURRENT SYSTEM STATE:
${contextJson}

Your capabilities:
1. DIAGNOSE: Analyze errors and suggest fixes
2. MONITOR: Explain system health metrics
3. MAINTAIN: Guide through maintenance tasks
4. OPTIMIZE: Suggest performance improvements
5. EXPLAIN: Explain any system behavior

Response style:
- Be direct and technical
- Provide specific code fixes when relevant
- Use bullet points for action items
- Flag critical issues immediately
- Format code in markdown code blocks

When you identify a critical issue, start with:
🚨 CRITICAL: [issue]

When suggesting a fix, provide:
1. Root cause
2. Exact fix (with code if needed)
3. Prevention steps

When system is healthy, be concise.`;
}

function detectCriticalIssue(response: string): boolean {
  return (
    response.includes("🚨 CRITICAL") ||
    /critical issue/i.test(response.slice(0, 200))
  );
}

function detectMaintenanceSuggestion(response: string): {
  suggested: boolean;
  title?: string;
  taskType?: string;
} {
  const lower = response.toLowerCase();
  if (lower.includes("database cleanup") || lower.includes("clean session_logs")) {
    return { suggested: true, title: "Database cleanup recommended", taskType: "database_cleanup" };
  }
  if (lower.includes("token audit") || lower.includes("refill tokens")) {
    return { suggested: true, title: "Token audit recommended", taskType: "token_audit" };
  }
  if (lower.includes("user sync") || lower.includes("clerk users")) {
    return { suggested: true, title: "User sync recommended", taskType: "user_sync" };
  }
  return { suggested: false };
}

async function getOrCreateConversation(
  adminId: string,
  conversationId?: string,
  contextType?: AriaContextType
): Promise<{ id: string; messages: AriaMessage[] } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Database not configured" };
  }

  const admin = createSupabaseAdmin();

  if (conversationId) {
    const { data } = await admin
      .from("aria_conversations")
      .select("id, messages, admin_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (data && data.admin_id === adminId) {
      return {
        id: data.id,
        messages: (data.messages as AriaMessage[]) ?? [],
      };
    }
  }

  const { data: created, error } = await admin
    .from("aria_conversations")
    .insert({
      admin_id: adminId,
      context_type: contextType ?? "general",
      messages: [],
    })
    .select("id, messages")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Failed to create conversation" };
  }

  return { id: created.id, messages: [] };
}

async function persistMessages(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  existing: AriaMessage[]
): Promise<void> {
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  const messages: AriaMessage[] = [
    ...existing,
    { role: "user", content: userContent, timestamp: now },
    { role: "assistant", content: assistantContent, timestamp: now },
  ];

  await admin
    .from("aria_conversations")
    .update({ messages, updated_at: now })
    .eq("id", conversationId);
}

async function postProcessResponse(
  adminId: string,
  response: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createSupabaseAdmin();

  if (detectCriticalIssue(response)) {
    await admin.from("safety_flags").insert({
      flag_type: "system_critical",
      severity: "critical",
      source: "aria",
      content_snippet: response.slice(0, 500),
      details: { detected_by: "aria", admin_id: adminId },
    });
  }

  const maintenance = detectMaintenanceSuggestion(response);
  if (maintenance.suggested && maintenance.title && maintenance.taskType) {
    await admin.from("maintenance_tasks").insert({
      title: maintenance.title,
      description: response.slice(0, 1000),
      task_type: maintenance.taskType,
      status: "pending",
      created_by: adminId,
    });
  }
}

export async function chatWithARIA(params: {
  adminId: string;
  message: string;
  conversationId?: string;
  contextType?: AriaContextType;
}): Promise<
  | { stream: ReadableStream<Uint8Array>; conversationId: string }
  | { error: string; status: number }
> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY not configured", status: 503 };
  }

  const context = await gatherSystemContext();
  const contextJson = JSON.stringify(context, null, 2);
  const systemPrompt = buildAriaSystemPrompt(contextJson);

  const conv = await getOrCreateConversation(
    params.adminId,
    params.conversationId,
    params.contextType
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
      model: ARIA_MODEL,
      max_tokens: 4096,
      temperature: 0.4,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: params.message },
      ],
    });
  } catch (err) {
    console.error("[chatWithARIA] OpenAI", err);
    const message =
      err instanceof OpenAI.APIError
        ? err.message
        : "ARIA unavailable. Check OPENAI_API_KEY.";
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
          await persistMessages(
            conversationId,
            userContent,
            assistantContent,
            existingMessages
          );
          await postProcessResponse(params.adminId, assistantContent);
        }
      } catch (err) {
        console.error("[chatWithARIA] stream", err);
        controller.error(err);
        return;
      }

      controller.close();
    },
  });

  return { stream, conversationId };
}

export async function listAriaConversations(adminId: string) {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("aria_conversations")
    .select("id, context_type, resolved, created_at, updated_at, messages")
    .eq("admin_id", adminId)
    .order("updated_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function listMaintenanceTasks() {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("maintenance_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function createMaintenanceTask(params: {
  adminId: string;
  title: string;
  description?: string;
  taskType: string;
}) {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("maintenance_tasks")
    .insert({
      title: params.title,
      description: params.description,
      task_type: params.taskType,
      status: "pending",
      created_by: params.adminId,
    })
    .select("*")
    .single();

  return data;
}
