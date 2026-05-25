import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { AssemblyHelpResult } from "@/lib/hardware/types";
import { buildSafeSystemPrompt, filterAIResponse } from "@/lib/safety/age-filter";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";

const MODULE_ASSEMBLY_CONTEXT: Record<
  number,
  { hardware: string; steps: string; commonIssues: string }
> = {
  4: {
    hardware: "ESP32-S3 with PCA9685 PWM driver and MG996R servos",
    steps:
      "Power wiring, I2C connection (SDA/SCL), servo channel assignment, sequential motion test",
    commonIssues:
      "Brownout from simultaneous servo moves, wrong I2C pins, insufficient 5V supply",
  },
  6: {
    hardware: "Bambu A1 Mini, PLA filament, printed brackets",
    steps:
      "Pre-flight checklist, bed leveling, first-layer check, post-print inspection",
    commonIssues:
      "Warping, poor adhesion, wrong orientation, insufficient supports",
  },
  7: {
    hardware:
      "Base frame with 6 servo slots, MG996R servos, servo horn kit, ESP32-S3",
    steps:
      "Base frame assembly, servo horn alignment, symmetry check, bolt tightness verification",
    commonIssues:
      "Servo horn misalignment, asymmetric mounting, overtightened screws, wrong horn orientation",
  },
  8: {
    hardware:
      "Upper arm, four-bar linkage, wrist J4, parallel gripper, MG996R × 6",
    steps:
      "Upper arm install, linkage connection, wrist articulation test, gripper alignment",
    commonIssues:
      "Linkage binding, wrist collision, gripper asymmetry, servo cable routing",
  },
};

function buildAsciiDiagram(moduleId: number): string {
  if (moduleId === 7) {
    return `
    ┌─────────────────────────┐
    │  [S1]    [S2]    [S3]   │  ← Servo slots (top view)
    │    \\      |      /     │
    │     \\     |     /      │
    │      [BASE FRAME]       │
    │  [S4]    [S5]    [S6]   │
    └─────────────────────────┘
    Align horns at 90° before tightening`;
  }

  return `
    [ESP32-S3]──I2C──[PCA9685]──PWM──[Servo 1..6]
         │                              │
        5V/10A PSU ─────────────────────┘
    Move ONE servo at a time with delay()`;
}

export async function getAssemblyHelp(
  moduleId: number,
  question: string,
  studentId: string
): Promise<AssemblyHelpResult> {
  const ctx = MODULE_ASSEMBLY_CONTEXT[moduleId] ?? {
    hardware: "KONSTRUKT robotics kit components",
    steps: "Follow the mission checklist and trainer guidance",
    commonIssues: "Double-check wiring and mechanical alignment",
  };

  let progressNote = "Unknown progress";
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdmin();
    const { data: progress } = await admin
      .from("progress")
      .select("status, score")
      .eq("student_id", studentId)
      .eq("module_id", moduleId)
      .maybeSingle();
    progressNote = progress
      ? `Status: ${progress.status}, score: ${progress.score ?? "N/A"}`
      : "Not started";
  }

  const fallback: AssemblyHelpResult = {
    answer: `For ${ctx.hardware}: ${ctx.steps}. Common issues: ${ctx.commonIssues}`,
    steps: ctx.steps.split(", "),
    diagramDescription: "Basic wiring and assembly layout for this module",
    diagramAscii: buildAsciiDiagram(moduleId),
  };

  if (!process.env.OPENAI_API_KEY || !question.trim()) {
    return fallback;
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
          content: buildSafeSystemPrompt(`You are a hardware assembly assistant for KONSTRUKT Academy (ages 9-16).
Only answer hardware/assembly questions — not general coding or AI tutoring.
Hardware: ESP32-S3, PCA9685, MG996R servos, 5V/10A PSU, Bambu A1 Mini.
CRITICAL: Sequential servo motion only — delay between joints.
Return JSON only.`),
        },
        {
          role: "user",
          content: `Module ${moduleId} assembly context:
Hardware: ${ctx.hardware}
Common steps: ${ctx.steps}
Common issues: ${ctx.commonIssues}
Student progress: ${progressNote}

Question: ${question}

Return JSON:
{
  "answer": string,
  "steps": string[],
  "diagramDescription": string,
  "diagramAscii": string
}`,
        },
      ],
    });

    const parsed = JSON.parse(
      response.choices[0]?.message?.content ?? "{}"
    ) as Partial<AssemblyHelpResult>;

    return {
      answer: filterAIResponse(parsed.answer ?? fallback.answer),
      steps: Array.isArray(parsed.steps) ? parsed.steps : fallback.steps,
      diagramDescription:
        parsed.diagramDescription ?? fallback.diagramDescription,
      diagramAscii: parsed.diagramAscii ?? buildAsciiDiagram(moduleId),
    };
  } catch (err) {
    console.error("[getAssemblyHelp]", err);
    return fallback;
  }
}
