import "server-only";

import OpenAI from "openai";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type CurriculumModuleInsight = {
  moduleId: number;
  title: string;
  avgScore: number;
  avgCompletionDays: number;
  totalAttempts: number;
  rejectionRate: number;
  dropoutRate: number;
  flags: string[];
  difficultyFlag: boolean;
};

export type CurriculumInsightsData = {
  modules: CurriculumModuleInsight[];
  computedAt: string;
};

function computeFlags(insight: Omit<CurriculumModuleInsight, "flags" | "difficultyFlag">): {
  flags: string[];
  difficultyFlag: boolean;
} {
  const flags: string[] = [];

  if (insight.avgScore < 65) flags.push("Too Hard");
  if (insight.rejectionRate > 40) flags.push("Review Needed");
  if (insight.avgCompletionDays > 7) flags.push("Too Long");
  if (insight.avgScore > 90 && insight.totalAttempts > 0) flags.push("Too Easy");
  if (flags.length === 0) flags.push("Good");

  return {
    flags,
    difficultyFlag: flags.some((f) => f !== "Good" && f !== "Too Easy"),
  };
}

export async function computeCurriculumInsights(): Promise<CurriculumInsightsData> {
  const empty: CurriculumInsightsData = {
    modules: [],
    computedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();

  const { data: modules } = await admin
    .from("modules")
    .select("id, title")
    .order("sort_order", { ascending: true });

  const { data: students } = await admin
    .from("users")
    .select("id")
    .eq("role", "student");

  const studentCount = students?.length ?? 0;
  const studentIds = (students ?? []).map((s) => s.id);

  const { data: submissions } = await admin
    .from("submissions")
    .select("module_id, status, score, submitted_at, reviewed_at, student_id")
    .in("student_id", studentIds.length ? studentIds : ["__none__"]);

  const { data: progressRows } = await admin
    .from("progress")
    .select("module_id, status, score, updated_at, student_id")
    .in("student_id", studentIds.length ? studentIds : ["__none__"]);

  const modulesInsight: CurriculumModuleInsight[] = [];

  for (const mod of modules ?? []) {
    const modSubs = (submissions ?? []).filter((s) => s.module_id === mod.id);
    const modProgress = (progressRows ?? []).filter((p) => p.module_id === mod.id);

    const totalAttempts = modSubs.length;
    const rejected = modSubs.filter((s) => s.status === "rejected").length;
    const rejectionRate =
      totalAttempts > 0 ? Math.round((rejected / totalAttempts) * 100) : 0;

    const scores = modSubs
      .filter((s) => s.score != null)
      .map((s) => s.score as number);
    const progressScores = modProgress
      .filter((p) => p.score != null)
      .map((p) => p.score as number);
    const allScores = [...scores, ...progressScores];
    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    const completionDays: number[] = [];
    for (const p of modProgress.filter((row) => row.status === "completed")) {
      const firstSub = modSubs
        .filter((s) => s.student_id === p.student_id)
        .sort(
          (a, b) =>
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime()
        )[0];
      if (firstSub?.submitted_at && p.updated_at) {
        const days = Math.max(
          1,
          Math.round(
            (new Date(p.updated_at).getTime() -
              new Date(firstSub.submitted_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        completionDays.push(days);
      }
    }

    const avgCompletionDays =
      completionDays.length > 0
        ? Math.round(
            completionDays.reduce((a, b) => a + b, 0) / completionDays.length
          )
        : 0;

    const lockedOrAbandoned = modProgress.filter(
      (p) => p.status === "locked" || p.status === "in_progress"
    ).length;
    const dropoutRate =
      studentCount > 0
        ? Math.round((lockedOrAbandoned / studentCount) * 100)
        : 0;

    const base = {
      moduleId: mod.id,
      title: mod.title,
      avgScore,
      avgCompletionDays,
      totalAttempts,
      rejectionRate,
      dropoutRate,
    };

    const { flags, difficultyFlag } = computeFlags(base);

    modulesInsight.push({ ...base, flags, difficultyFlag });

    await admin.from("curriculum_insights").insert({
      module_id: mod.id,
      avg_score: avgScore,
      avg_completion_days: avgCompletionDays,
      total_attempts: totalAttempts,
      rejection_rate: rejectionRate,
      dropout_rate: dropoutRate,
      difficulty_flag: difficultyFlag,
    });
  }

  return {
    modules: modulesInsight,
    computedAt: new Date().toISOString(),
  };
}

export async function generateCurriculumReport(
  modules: CurriculumModuleInsight[]
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return modules
      .filter((m) => m.difficultyFlag)
      .map(
        (m) =>
          `Module ${m.moduleId} (${m.title}): ${m.rejectionRate}% rejection rate, avg score ${m.avgScore}. Flags: ${m.flags.join(", ")}. Consider reviewing curriculum materials.`
      )
      .join("\n\n") || "All modules appear balanced based on current metrics.";
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const statsText = modules
    .map(
      (m) =>
        `Module ${m.moduleId} "${m.title}": avg score ${m.avgScore}, avg completion ${m.avgCompletionDays} days, rejection rate ${m.rejectionRate}%, attempts ${m.totalAttempts}, flags: ${m.flags.join(", ")}`
    )
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a curriculum analyst for a robotics academy. Provide concise, actionable recommendations based on module performance data. Format as bullet points with specific module references.",
      },
      {
        role: "user",
        content: `Analyze these module stats and recommend curriculum improvements:\n\n${statsText}`,
      },
    ],
    max_tokens: 800,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "Unable to generate report."
  );
}
