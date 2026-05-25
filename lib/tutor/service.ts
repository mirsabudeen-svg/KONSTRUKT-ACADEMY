import "server-only";

import OpenAI from "openai";

import { buildSafeSystemPrompt, filterAIResponse } from "@/lib/safety/age-filter";
import type { ModuleContext, TutorMessage } from "@/lib/tutor/types";
import { extractMemory, fetchStudentMemoryContext } from "@/lib/ai/memory-extractor";
import { getModuleObjectives } from "@/lib/tutor/module-briefs";
import {
  BROWNOUT_RULE,
  TUTOR_MAX_OUTPUT_TOKENS,
  TUTOR_MAX_WORDS,
  TUTOR_RATE_LIMIT_PER_MINUTE,
} from "@/lib/tutor/constraints";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureStudentProfile } from "@/lib/user";

const DEFAULT_MODEL = "gpt-4o-mini";

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export function getTutorModel(): string {
  return process.env.OPENAI_TUTOR_MODEL ?? DEFAULT_MODEL;
}

function progressToCompletionPercent(
  status: string | undefined,
  score: number | null | undefined
): number {
  if (score != null && score > 0) return Math.min(100, score);
  switch (status) {
    case "completed":
      return 100;
    case "pending_review":
      return 75;
    case "in_progress":
      return 50;
    case "ready":
      return 25;
    default:
      return 0;
  }
}

const MODULE_HARDWARE: Record<number, string[]> = {
  4: ["ESP32-S3", "PCA9685", "MG996R"],
  7: ["MG996R servos", "Servo horns"],
  8: ["Four-bar linkage", "Parallel gripper"],
  9: ["ESP32-S3", "5V/10A PSU", "Sequential motion only"],
};

export async function fetchModuleContext(
  studentId: string,
  moduleId: number
): Promise<ModuleContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const [moduleResult, progressResult] = await Promise.all([
    supabase.from("modules").select("*").eq("id", moduleId).maybeSingle(),
    supabase
      .from("progress")
      .select("status, score")
      .eq("student_id", studentId)
      .eq("module_id", moduleId)
      .maybeSingle(),
  ]);

  if (!moduleResult.data) return null;

  const mod = moduleResult.data;
  const progress = progressResult.data;

  return {
    moduleId,
    title: mod.title,
    description: mod.description,
    badgeName: mod.badge_name,
    objectives: getModuleObjectives(moduleId),
    completionPercentage: progressToCompletionPercent(
      progress?.status,
      progress?.score
    ),
    progressStatus: progress?.status ?? "locked",
    hardwareNotes:
      MODULE_HARDWARE[moduleId] ??
      (mod.required_hardware?.length ? mod.required_hardware : []),
  };
}

export function buildTutorSystemPrompt(
  ctx: ModuleContext,
  memoryContext?: string
): string {
  const objectives = ctx.objectives.map((o) => `- ${o}`).join("\n");
  const hardware =
    ctx.hardwareNotes.length > 0
      ? ctx.hardwareNotes.map((h) => `- ${h}`).join("\n")
      : "- General KONSTRUKT arm components";

  return `You are a friendly robotics tutor helping a student (age 9–16) learn about "${ctx.title}".

Module Description: ${ctx.description ?? "KONSTRUKT robotics academy mission."}
Learning Objectives:
${objectives}

Student Progress: ${ctx.completionPercentage}% (${ctx.progressStatus.replace(/_/g, " ")})
Badge: ${ctx.badgeName}

Hardware focus for this mission:
${hardware}

${BROWNOUT_RULE}

Guidelines:
- Use the Socratic method: ask guiding questions instead of giving direct answers
- Explain concepts clearly but concisely
- If they ask for code solutions, guide them to write it themselves — hints only
- Be encouraging and supportive
- Keep responses under ${TUTOR_MAX_WORDS} words
- Use age-appropriate language
- If stuck, provide hints, not full solutions
- Stay on-topic for this mission module${
    memoryContext
      ? `

${memoryContext}`
      : ""
  }`;
}

export async function checkTutorRateLimit(
  studentId: string
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { allowed: true };

  const since = new Date(Date.now() - 60_000).toISOString();

  const { data: convs } = await supabase
    .from("tutor_conversations")
    .select("id")
    .eq("student_id", studentId);

  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length === 0) return { allowed: true };

  const { count, error } = await supabase
    .from("tutor_messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", since)
    .in("conversation_id", convIds);

  if (error) {
    console.error("[checkTutorRateLimit]", error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= TUTOR_RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, retryAfterSec: 60 };
  }

  return { allowed: true };
}

export async function getOrCreateConversation(
  studentId: string,
  moduleId: number,
  conversationId?: string
): Promise<{ id: string } | { error: string }> {
  await ensureStudentProfile(studentId);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Database unavailable" };

  if (conversationId) {
    const { data, error } = await supabase
      .from("tutor_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (error || !data) return { error: "Conversation not found" };
    return { id: data.id };
  }

  const { data: existing } = await supabase
    .from("tutor_conversations")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { id: existing.id };

  const { data: created, error: insertError } = await supabase
    .from("tutor_conversations")
    .insert({ student_id: studentId, module_id: moduleId })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: insertError?.message ?? "Failed to create conversation" };
  }

  return { id: created.id };
}

export async function loadConversationMessages(
  conversationId: string,
  studentId: string
): Promise<TutorMessage[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: conv } = await supabase
    .from("tutor_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!conv) return [];

  const { data, error } = await supabase
    .from("tutor_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) return [];

  return (data ?? []).map((m) => ({
    id: m.id,
    role: m.role as TutorMessage["role"],
    content: m.content,
    created_at: m.created_at,
  }));
}

export async function loadLatestConversation(
  studentId: string,
  moduleId: number
): Promise<{ conversationId: string | null; messages: TutorMessage[] }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { conversationId: null, messages: [] };

  const { data: conv } = await supabase
    .from("tutor_conversations")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conv) return { conversationId: null, messages: [] };

  const messages = await loadConversationMessages(conv.id, studentId);
  return { conversationId: conv.id, messages };
}

async function persistMessages(
  conversationId: string,
  userContent: string,
  assistantContent: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase.from("tutor_messages").insert([
    { conversation_id: conversationId, role: "user", content: userContent },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: assistantContent,
    },
  ]);

  const { data: allMessages } = await supabase
    .from("tutor_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const jsonSnapshot = (allMessages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
    at: m.created_at,
  }));

  await supabase
    .from("tutor_conversations")
    .update({ messages: jsonSnapshot })
    .eq("id", conversationId);
}

export async function clearConversation(
  studentId: string,
  conversationId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Database unavailable" };

  const { data: conv } = await supabase
    .from("tutor_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!conv) return { error: "Conversation not found" };

  await supabase
    .from("tutor_messages")
    .delete()
    .eq("conversation_id", conversationId);

  await supabase
    .from("tutor_conversations")
    .update({ messages: [] })
    .eq("id", conversationId);

  return { ok: true };
}

type StreamTutorChatParams = {
  studentId: string;
  moduleId: number;
  userMessage: string;
  conversationId?: string;
  safetyNote?: string;
};

export async function streamTutorChat(
  params: StreamTutorChatParams
): Promise<
  | {
      stream: ReadableStream<Uint8Array>;
      conversationId: string;
    }
  | { error: string; status: number }
> {
  const ctx = await fetchModuleContext(params.studentId, params.moduleId);
  if (!ctx) {
    return { error: "Module not found", status: 404 };
  }

  const rate = await checkTutorRateLimit(params.studentId);
  if (!rate.allowed) {
    return {
      error: `Rate limit exceeded. Try again in ${rate.retryAfterSec} seconds.`,
      status: 429,
    };
  }

  const conv = await getOrCreateConversation(
    params.studentId,
    params.moduleId,
    params.conversationId
  );
  if ("error" in conv) {
    return { error: conv.error, status: 500 };
  }

  const history = await loadConversationMessages(conv.id, params.studentId);
  const memoryContext = await fetchStudentMemoryContext(
    params.studentId,
    params.moduleId
  );
  const systemPrompt = buildSafeSystemPrompt(
    buildTutorSystemPrompt(ctx, memoryContext) +
      (params.safetyNote ? `\n\n${params.safetyNote}` : "")
  );

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: params.userMessage },
  ];

  let completion: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    completion = await getOpenAIClient().chat.completions.create({
      model: getTutorModel(),
      max_tokens: TUTOR_MAX_OUTPUT_TOKENS,
      temperature: 0.7,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...openaiMessages],
    });
  } catch (err) {
    console.error("[streamTutorChat] OpenAI", err);
    const message =
      err instanceof OpenAI.APIError
        ? err.message
        : "AI tutor unavailable. Check OPENAI_API_KEY.";
    const status = err instanceof OpenAI.APIError ? err.status ?? 502 : 502;
    return { error: message, status };
  }

  const conversationId = conv.id;
  const userContent = params.userMessage;

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
          assistantContent = filterAIResponse(assistantContent);
          await persistMessages(conversationId, userContent, assistantContent);
          const updatedHistory = await loadConversationMessages(
            conversationId,
            params.studentId
          );
          void extractMemory(
            params.studentId,
            params.moduleId,
            updatedHistory
          ).catch((err) => console.error("[extractMemory]", err));
        }
      } catch (err) {
        console.error("[streamTutorChat] stream", err);
        controller.error(err);
        return;
      }

      controller.close();
    },
  });

  return { stream, conversationId };
}
