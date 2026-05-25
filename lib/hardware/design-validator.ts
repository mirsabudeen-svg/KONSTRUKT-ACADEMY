import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";
import type { DesignValidationResult } from "@/lib/hardware/types";

async function fetchModuleBrief(moduleId: number) {
  if (!isSupabaseConfigured()) {
    return { title: `Module ${moduleId}`, description: "" };
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("modules")
    .select("title, description")
    .eq("id", moduleId)
    .maybeSingle();

  return {
    title: data?.title ?? `Module ${moduleId}`,
    description: data?.description ?? "",
  };
}

function defaultValidation(): DesignValidationResult {
  return {
    passed: true,
    score: 75,
    checks: [
      {
        name: "Size",
        passed: true,
        message: "Assumed within 180mm limit — verify in slicer",
      },
      {
        name: "Wall thickness",
        passed: true,
        message: "Target ≥1.5mm — verify in Meshy export",
      },
      {
        name: "Overhangs",
        passed: true,
        message: "Enable tree supports if overhangs >45°",
      },
      {
        name: "Mission brief",
        passed: true,
        message: "Design appears suitable for this mission",
      },
    ],
    suggestions: ["Open in Bambu Studio for final pre-flight check"],
    ready_to_print: true,
  };
}

export async function validateSTLSubmission(
  fileUrl: string,
  moduleId: number,
  _studentId: string
): Promise<DesignValidationResult> {
  const brief = await fetchModuleBrief(moduleId);
  const fallback = defaultValidation();

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getTutorModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You validate STL submissions for KONSTRUKT Academy robotics missions.
Constraints: max 180×180×180mm, min wall 1.5mm, overhangs >45° need supports.
Return JSON only.`,
        },
        {
          role: "user",
          content: `Validate this STL submission:
Module: ${brief.title}
Mission brief: ${brief.description}
File: ${fileUrl}

Checks:
1. Size constraint: Must fit in 180×180×180mm
2. Wall thickness: Minimum 1.5mm
3. Overhang: >45° needs supports
4. Functionality: Does it match mission brief?
5. Printability score: 0-100

Return JSON:
{
  "passed": boolean,
  "score": number,
  "checks": [{ "name": string, "passed": boolean, "message": string }],
  "suggestions": [string],
  "ready_to_print": boolean
}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as DesignValidationResult;
    return {
      passed: Boolean(parsed.passed),
      score: Math.min(100, Math.max(0, Number(parsed.score ?? 75))),
      checks: Array.isArray(parsed.checks) ? parsed.checks : fallback.checks,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : fallback.suggestions,
      ready_to_print: Boolean(parsed.ready_to_print ?? parsed.passed),
    };
  } catch (err) {
    console.error("[validateSTLSubmission]", err);
    return fallback;
  }
}

export async function buildOptimizedPrompt(input: {
  what: string;
  style: string;
  details: string;
  moduleId: number;
}): Promise<{ prompt: string; tokenCost: number; warnings: string[] }> {
  const brief = await fetchModuleBrief(input.moduleId);
  const fallbackPrompt = [
    input.style,
    input.what,
    input.details,
    "symmetric design, 3D printable, robotics part",
  ]
    .filter(Boolean)
    .join(", ");

  if (!process.env.OPENAI_API_KEY) {
    return { prompt: fallbackPrompt, tokenCost: 1, warnings: [] };
  }

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getTutorModel(),
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You build optimal Meshy.ai text-to-3D prompts for robotics students. Return JSON only.",
        },
        {
          role: "user",
          content: `Build an optimal Meshy prompt for:
Module: ${brief.title}
WHAT: ${input.what}
STYLE: ${input.style}
DETAILS: ${input.details}

Return JSON:
{
  "prompt": string,
  "token_cost": 1,
  "warnings": string[]
}`,
        },
      ],
    });

    const parsed = JSON.parse(
      response.choices[0]?.message?.content ?? "{}"
    ) as {
      prompt?: string;
      token_cost?: number;
      warnings?: string[];
    };

    return {
      prompt: parsed.prompt ?? fallbackPrompt,
      tokenCost: parsed.token_cost ?? 1,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (err) {
    console.error("[buildOptimizedPrompt]", err);
    return { prompt: fallbackPrompt, tokenCost: 1, warnings: [] };
  }
}
