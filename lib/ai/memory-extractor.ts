import "server-only";

import type { MemoryType } from "@/lib/ai/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";
import type { TutorMessage } from "@/lib/tutor/types";

type ExtractedMemory = {
  struggled_concepts: string[];
  mastered_concepts: string[];
  hints_needed: boolean;
  learning_style: "visual" | "conceptual" | "hands_on" | "unknown";
  common_mistakes: string[];
};

const EXTRACT_PROMPT = `Analyze this tutoring conversation and extract learning insights. Return JSON only:
{
  "struggled_concepts": [string],
  "mastered_concepts": [string],
  "hints_needed": boolean,
  "learning_style": "visual"|"conceptual"|"hands_on"|"unknown",
  "common_mistakes": [string]
}`;

export async function fetchStudentMemoryContext(
  studentId: string,
  moduleId: number
): Promise<string> {
  if (!isSupabaseConfigured()) return "";

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("tutor_memory")
    .select("memory_type, content")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (!data?.length) return "";

  const struggled = data
    .filter((m) => m.memory_type === "struggled_concept")
    .map((m) => m.content);
  const mastered = data
    .filter((m) => m.memory_type === "mastered_concept")
    .map((m) => m.content);
  const mistakes = data
    .filter((m) => m.memory_type === "common_mistake")
    .map((m) => m.content);
  const style = data.find((m) => m.memory_type === "learning_style")?.content;

  const lines = [
    "Student Memory Context:",
    struggled.length
      ? `- Has struggled with: ${[...new Set(struggled)].join(", ")}`
      : null,
    mastered.length
      ? `- Has mastered: ${[...new Set(mastered)].join(", ")}`
      : null,
    mistakes.length
      ? `- Common mistakes: ${[...new Set(mistakes)].join(", ")}`
      : null,
    style ? `- Learning style: ${style}` : null,
    "Use this to personalize your response.",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function extractMemory(
  studentId: string,
  moduleId: number,
  conversation: TutorMessage[]
): Promise<void> {
  if (!isSupabaseConfigured() || conversation.length < 2) return;

  const transcript = conversation
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  let extracted: ExtractedMemory;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: getTutorModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    extracted = JSON.parse(raw) as ExtractedMemory;
  } catch (err) {
    console.error("[extractMemory] OpenAI", err);
    return;
  }

  const admin = createSupabaseAdmin();

  const inserts: { type: MemoryType; content: string; confidence: number }[] =
    [];

  for (const concept of extracted.struggled_concepts ?? []) {
    if (concept.trim()) {
      inserts.push({
        type: "struggled_concept",
        content: concept.trim(),
        confidence: 0.7,
      });
    }
  }

  for (const concept of extracted.mastered_concepts ?? []) {
    if (concept.trim()) {
      inserts.push({
        type: "mastered_concept",
        content: concept.trim(),
        confidence: 0.8,
      });
    }
  }

  for (const mistake of extracted.common_mistakes ?? []) {
    if (mistake.trim()) {
      inserts.push({
        type: "common_mistake",
        content: mistake.trim(),
        confidence: 0.75,
      });
    }
  }

  if (extracted.hints_needed) {
    inserts.push({
      type: "hint_used",
      content: "Student needed hints during this session",
      confidence: 0.6,
    });
  }

  const style = extracted.learning_style ?? "unknown";
  if (style !== "unknown") {
    await admin
      .from("tutor_memory")
      .delete()
      .eq("student_id", studentId)
      .eq("module_id", moduleId)
      .eq("memory_type", "learning_style");

    inserts.push({
      type: "learning_style",
      content: style,
      confidence: 0.65,
    });
  }

  for (const item of inserts) {
    const { data: existing } = await admin
      .from("tutor_memory")
      .select("id")
      .eq("student_id", studentId)
      .eq("module_id", moduleId)
      .eq("memory_type", item.type)
      .eq("content", item.content)
      .maybeSingle();

    if (existing) {
      await admin
        .from("tutor_memory")
        .update({
          confidence: item.confidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("tutor_memory").insert({
        student_id: studentId,
        module_id: moduleId,
        memory_type: item.type,
        content: item.content,
        confidence: item.confidence,
      });
    }
  }
}
