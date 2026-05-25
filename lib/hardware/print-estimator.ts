import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";
import type { DesignConstraintCheck, PrintEstimate } from "@/lib/hardware/types";

const TYPICAL_PARTS: Record<number, string> = {
  3: "servo mounting bracket or gripper jaw",
  5: "robotic gripper jaw or joint housing",
  6: "test calibration cube or bracket",
};

async function fetchModuleContext(moduleId: number) {
  if (!isSupabaseConfigured()) {
    return { title: `Module ${moduleId}`, description: "", typicalPart: "robotics part" };
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
    typicalPart: TYPICAL_PARTS[moduleId] ?? "robotics part",
  };
}

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch?.[0] ?? trimmed) as T;
}

export async function estimatePrintJob(
  fileUrl: string,
  moduleId: number
): Promise<PrintEstimate> {
  const ctx = await fetchModuleContext(moduleId);

  const fallback: PrintEstimate = {
    estimated_minutes: 45,
    material: "PLA",
    weight_grams: 12,
    difficulty: "medium",
    potential_issues: ["Verify first-layer adhesion", "Check bed leveling"],
    recommended_settings: {
      layer_height: "0.2mm",
      infill: "20%",
      supports: true,
      orientation: "Flat on largest face",
    },
  };

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
          content: `You estimate 3D print specs for a Bambu A1 Mini (180×180×180mm build volume). Return JSON only.`,
        },
        {
          role: "user",
          content: `Based on this module context, estimate 3D print specs:
Module: ${ctx.title}
Description: ${ctx.description}
Typical part: ${ctx.typicalPart}
File URL: ${fileUrl}

Return JSON only:
{
  "estimated_minutes": number,
  "material": "PLA",
  "weight_grams": number,
  "difficulty": "easy"|"medium"|"hard",
  "potential_issues": string[],
  "recommended_settings": {
    "layer_height": string,
    "infill": string,
    "supports": boolean,
    "orientation": string
  }
}`,
        },
      ],
    });

    const parsed = parseJson<PrintEstimate>(
      response.choices[0]?.message?.content ?? "{}"
    );
    return { ...fallback, ...parsed, material: parsed.material ?? "PLA" };
  } catch (err) {
    console.error("[estimatePrintJob]", err);
    return fallback;
  }
}

export async function validateDesign(
  fileUrl: string,
  moduleId: number
): Promise<DesignConstraintCheck> {
  const ctx = await fetchModuleContext(moduleId);

  const fallback: DesignConstraintCheck = {
    within_size_limit: true,
    estimated_dimensions: "Unknown — verify in slicer",
    needs_supports: true,
    printability_score: 70,
    issues: [],
    suggestions: ["Open in Bambu Studio and verify dimensions"],
  };

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
          content:
            "You validate 3D printable robotics parts for KONSTRUKT Academy. Max build size 180×180×180mm. Return JSON only.",
        },
        {
          role: "user",
          content: `Validate this design submission:
Module: ${ctx.title}
Description: ${ctx.description}
File: ${fileUrl}

Return JSON:
{
  "within_size_limit": boolean,
  "estimated_dimensions": string,
  "needs_supports": boolean,
  "printability_score": number,
  "issues": string[],
  "suggestions": string[]
}`,
        },
      ],
    });

    return parseJson<DesignConstraintCheck>(
      response.choices[0]?.message?.content ?? "{}"
    );
  } catch (err) {
    console.error("[validateDesign]", err);
    return fallback;
  }
}
