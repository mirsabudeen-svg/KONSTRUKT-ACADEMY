import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";

type StuckStudent = {
  studentId: string;
  moduleId: number;
  moduleTitle: string;
  updatedAt: string;
};

export async function findStuckStudents(): Promise<StuckStudent[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();
  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: progressRows } = await admin
    .from("progress")
    .select("student_id, module_id, updated_at")
    .eq("status", "in_progress")
    .lt("updated_at", threeDaysAgo);

  if (!progressRows?.length) return [];

  const { data: recentConversations } = await admin
    .from("tutor_conversations")
    .select("student_id")
    .gt("created_at", twoDaysAgo);

  const activeStudentIds = new Set(
    (recentConversations ?? []).map((c) => c.student_id)
  );

  const stuck = progressRows.filter(
    (p) => !activeStudentIds.has(p.student_id)
  );

  if (stuck.length === 0) return [];

  const moduleIds = [...new Set(stuck.map((s) => s.module_id))];
  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .in("id", moduleIds);

  const titleById = new Map(
    (modules ?? []).map((m) => [m.id, m.title as string])
  );

  return stuck.map((row) => ({
    studentId: row.student_id,
    moduleId: row.module_id,
    moduleTitle: titleById.get(row.module_id) ?? `Module ${row.module_id}`,
    updatedAt: row.updated_at,
  }));
}

async function generateHint(
  moduleTitle: string,
  moduleId: number
): Promise<string> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: getTutorModel(),
      temperature: 0.7,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "You are a friendly robotics tutor for ages 9-16. Give ONE short, encouraging hint (2-3 sentences max) to help a stuck student get started. Do not give full solutions.",
        },
        {
          role: "user",
          content: `The student has been stuck on "${moduleTitle}" (Module ${moduleId}) for several days. Give them a helpful starting hint.`,
        },
      ],
    });

    return (
      completion.choices[0]?.message?.content?.trim() ??
      "Try breaking the mission into smaller steps — start with one servo move and a delay() between moves."
    );
  } catch {
    return "Try breaking the mission into smaller steps — start with one servo move and a delay() between moves.";
  }
}

export async function checkAndSendHints(): Promise<{ sent: number }> {
  if (!isSupabaseConfigured()) return { sent: 0 };

  const stuckStudents = await findStuckStudents();
  if (stuckStudents.length === 0) return { sent: 0 };

  const admin = createSupabaseAdmin();
  let sent = 0;

  for (const student of stuckStudents) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentHint } = await admin
      .from("notifications")
      .select("id")
      .eq("student_id", student.studentId)
      .eq("type", "proactive_hint")
      .eq("module_id", student.moduleId)
      .gt("created_at", oneDayAgo)
      .maybeSingle();

    if (recentHint) continue;

    const hint = await generateHint(student.moduleTitle, student.moduleId);

    await admin.from("notifications").insert({
      student_id: student.studentId,
      type: "proactive_hint",
      title: `💡 Stuck on ${student.moduleTitle}?`,
      message: `Here's a hint to get you started: ${hint}`,
      module_id: student.moduleId,
    });

    sent++;
  }

  return { sent };
}
