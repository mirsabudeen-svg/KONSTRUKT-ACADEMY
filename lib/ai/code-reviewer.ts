import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";
import { buildSafeSystemPrompt } from "@/lib/safety/age-filter";
import type { CodeReviewResult, CodeReviewSummary } from "@/lib/ai/types";

const CODE_REVIEW_SYSTEM_PROMPT = buildSafeSystemPrompt(`You are an expert Arduino/ESP32 code reviewer for a robotics academy. Students are aged 9-16.
Analyze the code and return a JSON response only.

Hardware context:
- ESP32-S3 microcontroller
- PCA9685 PWM driver
- MG996R servo motors (6 total)
- 5V/10A power supply
- CRITICAL: Moving multiple servos simultaneously causes brownout. ALL code MUST use sequential motion with delay() between servo movements.

Return JSON:
{
  "score": 0-100,
  "passed": boolean,
  "issues": [
    { "line": number, "severity": "error"|"warning"|"info", "message": string, "fix": string }
  ],
  "hardware_violations": [
    { "type": "brownout"|"power"|"pin_conflict", "description": string, "fix": string }
  ],
  "suggestions": [string],
  "positive_feedback": string,
  "summary": string
}`);

function parseReviewJson(raw: string): CodeReviewResult {
  const parsed = JSON.parse(raw) as Partial<CodeReviewResult>;
  return {
    score: Math.min(100, Math.max(0, Number(parsed.score ?? 0))),
    passed: Boolean(parsed.passed),
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    hardware_violations: Array.isArray(parsed.hardware_violations)
      ? parsed.hardware_violations
      : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    positive_feedback: parsed.positive_feedback ?? "",
    summary: parsed.summary ?? "",
  };
}

function buildTrainerNotes(review: CodeReviewResult): string | null {
  const parts: string[] = [];

  if (review.hardware_violations.length > 0) {
    parts.push(
      `⚠️ AI detected ${review.hardware_violations.length} hardware violation(s):`
    );
    for (const v of review.hardware_violations) {
      parts.push(`• [${v.type}] ${v.description}`);
    }
  }

  if (review.summary) {
    parts.push(`AI summary: ${review.summary}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

export async function reviewCode(
  submissionId: string | null,
  code: string,
  moduleId: number,
  studentId: string,
  options?: { persist?: boolean }
): Promise<{ review: CodeReviewResult; summary: CodeReviewSummary }> {
  const persist = options?.persist ?? true;
  const trimmed = code.trim();

  if (!trimmed) {
    const empty: CodeReviewResult = {
      score: 0,
      passed: false,
      issues: [
        {
          line: 0,
          severity: "error",
          message: "No code provided",
          fix: "Add your Arduino/C++ code before submitting",
        },
      ],
      hardware_violations: [],
      suggestions: [],
      positive_feedback: "",
      summary: "Empty submission",
    };
    return { review: empty, summary: toSummary(empty) };
  }

  let review: CodeReviewResult;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: getTutorModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CODE_REVIEW_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Module ID: ${moduleId}\n\nStudent code:\n\`\`\`cpp\n${trimmed}\n\`\`\``,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    review = parseReviewJson(content);
  } catch (err) {
    console.error("[reviewCode] OpenAI", err);
    review = {
      score: 50,
      passed: true,
      issues: [],
      hardware_violations: [],
      suggestions: ["AI review unavailable — trainer will review manually"],
      positive_feedback: "",
      summary: "AI review skipped due to API error",
    };
  }

  const summary = toSummary(review);

  if (persist && isSupabaseConfigured() && submissionId) {
    await saveCodeReview(submissionId, studentId, moduleId, review);
  }

  return { review, summary };
}

function toSummary(review: CodeReviewResult): CodeReviewSummary {
  return {
    aiScore: review.score,
    passed: review.passed,
    hardwareViolationCount: review.hardware_violations.length,
    issueCount: review.issues.length,
    suggestions: review.suggestions,
    summary: review.summary || null,
    positiveFeedback: review.positive_feedback || null,
  };
}

async function saveCodeReview(
  submissionId: string,
  studentId: string,
  moduleId: number,
  review: CodeReviewResult
): Promise<void> {
  const admin = createSupabaseAdmin();
  const hasHardwareViolations = review.hardware_violations.length > 0;
  const trainerNotes = buildTrainerNotes(review);

  await admin.from("code_reviews").insert({
    submission_id: submissionId,
    student_id: studentId,
    module_id: moduleId,
    ai_score: review.score,
    issues: review.issues,
    suggestions: review.suggestions,
    hardware_violations: review.hardware_violations,
    positive_feedback: review.positive_feedback,
    summary: review.summary,
    passed: review.passed,
  });

  await admin
    .from("submissions")
    .update({
      ai_warning: hasHardwareViolations,
      ai_pre_score: review.score,
      trainer_notes: trainerNotes,
    })
    .eq("id", submissionId);
}

export async function fetchCodeReviewForSubmission(
  submissionId: string
): Promise<CodeReviewSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("code_reviews")
    .select(
      "ai_score, passed, hardware_violations, issues, suggestions, summary, positive_feedback"
    )
    .eq("submission_id", submissionId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const hardwareViolations = Array.isArray(data.hardware_violations)
    ? data.hardware_violations
    : [];
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

  return {
    aiScore: data.ai_score,
    passed: data.passed ?? false,
    hardwareViolationCount: hardwareViolations.length,
    issueCount: issues.length,
    suggestions: suggestions as string[],
    summary: data.summary,
    positiveFeedback: data.positive_feedback,
  };
}
