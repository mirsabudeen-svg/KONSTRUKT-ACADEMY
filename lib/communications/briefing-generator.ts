import "server-only";

import OpenAI from "openai";

import type { DailyBriefing } from "@/lib/communications/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayBriefing(
  studentId: string
): Promise<DailyBriefing | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("daily_briefings")
    .select("*")
    .eq("student_id", studentId)
    .eq("briefing_date", todayIso())
    .maybeSingle();

  return data as DailyBriefing | null;
}

export async function generateDailyBriefing(
  studentId: string
): Promise<DailyBriefing | null> {
  if (!isSupabaseConfigured()) return null;

  const existing = await getTodayBriefing(studentId);
  if (existing) return existing;

  const admin = createSupabaseAdmin();

  const { data: progressRows } = await admin
    .from("progress")
    .select("module_id, status, score")
    .eq("student_id", studentId)
    .order("module_id", { ascending: true });

  const current =
    (progressRows ?? []).find(
      (p) =>
        p.status === "in_progress" ||
        p.status === "ready" ||
        p.status === "pending_review"
    ) ??
    (progressRows ?? []).find((p) => p.status === "locked") ??
    (progressRows ?? [])[0];

  const moduleId = current?.module_id ?? 1;

  const { data: moduleRow } = await admin
    .from("modules")
    .select("title, description")
    .eq("id", moduleId)
    .maybeSingle();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { data: yesterdayBriefing } = await admin
    .from("daily_briefings")
    .select("task")
    .eq("student_id", studentId)
    .eq("briefing_date", yesterday.toISOString().slice(0, 10))
    .maybeSingle();

  const completedCount = (progressRows ?? []).filter(
    (p) => p.status === "completed"
  ).length;
  const progressPct = Math.round((completedCount / 10) * 100);

  let content = "Ready for today's robotics mission? Focus on one small step forward.";
  let task = "Review your current module notes and write down one question for your tutor.";
  let xpReward = 10;

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Generate a short daily mission briefing for a robotics student (age 9-16).

Student context:
- Current module: ${moduleRow?.title ?? "Launch Sequence"}
- Module description: ${moduleRow?.description ?? "Robotics fundamentals"}
- Progress: ${progressPct}% complete
- Yesterday's task: ${yesterdayBriefing?.task ?? "none"}

Return JSON only:
{
  "content": "string",
  "task": "string",
  "xp_reward": 10
}

Keep tasks achievable in 15-30 minutes.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const parsed = JSON.parse(
        completion.choices[0]?.message?.content ?? "{}"
      ) as {
        content?: string;
        task?: string;
        xp_reward?: number;
      };

      if (parsed.content) content = parsed.content;
      if (parsed.task) task = parsed.task;
      if (parsed.xp_reward) xpReward = parsed.xp_reward;
    } catch (err) {
      console.error("[generateDailyBriefing] OpenAI:", err);
    }
  }

  const { data: inserted, error } = await admin
    .from("daily_briefings")
    .insert({
      student_id: studentId,
      briefing_date: todayIso(),
      content,
      task,
      xp_reward: xpReward,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    console.error("[generateDailyBriefing] insert:", error?.message);
    return null;
  }

  await admin.from("notifications").insert({
    student_id: studentId,
    type: "trainer_message",
    title: "📋 Today's Mission Brief",
    message: content.slice(0, 120),
    module_id: moduleId,
  });

  return inserted as DailyBriefing;
}

export async function completeDailyBriefing(
  studentId: string,
  briefingId: string
): Promise<{ ok: true; xp: number } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const admin = createSupabaseAdmin();
  const { data: briefing } = await admin
    .from("daily_briefings")
    .select("*")
    .eq("id", briefingId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!briefing) return { ok: false, error: "Briefing not found" };
  if (briefing.completed) return { ok: false, error: "Already completed" };

  const { error } = await admin
    .from("daily_briefings")
    .update({ completed: true })
    .eq("id", briefingId);

  if (error) return { ok: false, error: error.message };

  const { awardXP } = await import("@/lib/gamification/xp-engine");
  await awardXP(
    studentId,
    "daily_briefing",
    briefing.xp_reward ?? 10,
    undefined,
    "Daily mission brief completed"
  );

  return { ok: true, xp: briefing.xp_reward ?? 10 };
}

export async function skipDailyBriefing(
  studentId: string,
  briefingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Not configured" };
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("daily_briefings")
    .update({ completed: true })
    .eq("id", briefingId)
    .eq("student_id", studentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
