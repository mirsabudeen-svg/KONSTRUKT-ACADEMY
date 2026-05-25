import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSafetyFlag } from "@/lib/safety/flags";
import { fetchSafetySettings } from "@/lib/safety/settings";
import type { PlagiarismCheckResult } from "@/lib/safety/types";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";

function normalizeCode(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function similarityScore(a: string, b: string): number {
  const na = normalizeCode(a);
  const nb = normalizeCode(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const longer = na.length >= nb.length ? na : nb;
  const shorter = na.length >= nb.length ? nb : na;

  if (longer.includes(shorter) && shorter.length > 20) {
    return shorter.length / longer.length;
  }

  const bigrams = new Map<string, number>();
  for (let i = 0; i < shorter.length - 1; i++) {
    const bg = shorter.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < longer.length - 1; i++) {
    const bg = longer.slice(i, i + 2);
    const count = bigrams.get(bg) ?? 0;
    if (count > 0) {
      matches++;
      bigrams.set(bg, count - 1);
    }
  }

  return (2 * matches) / (na.length + nb.length - 2);
}

function extractCodeFromContent(contentUrl: string | null): string {
  if (!contentUrl) return "";
  try {
    const parsed = JSON.parse(contentUrl) as { text?: string };
    if (parsed.text) return parsed.text;
  } catch {
    /* plain text or URL */
  }
  return contentUrl;
}

async function checkAiGeneration(code: string): Promise<{
  ai_generated_probability: number;
  indicators: string[];
  verdict: PlagiarismCheckResult["ai_verdict"];
}> {
  const fallback = {
    ai_generated_probability: 0,
    indicators: [] as string[],
    verdict: "student_written" as const,
  };

  if (!process.env.OPENAI_API_KEY || code.trim().length < 30) return fallback;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getTutorModel(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `Analyze this code submission from a 9-16 year old student learning Arduino.
Return JSON:
{
  "ai_generated_probability": 0.0-1.0,
  "indicators": string[],
  "verdict": "student_written"|"likely_ai"|"definitely_ai"
}

Code:
${code.slice(0, 3000)}`,
        },
      ],
    });

    const parsed = JSON.parse(
      response.choices[0]?.message?.content ?? "{}"
    ) as Partial<{
      ai_generated_probability: number;
      indicators: string[];
      verdict: PlagiarismCheckResult["ai_verdict"];
    }>;

    return {
      ai_generated_probability: Math.min(
        1,
        Math.max(0, Number(parsed.ai_generated_probability ?? 0))
      ),
      indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
      verdict: parsed.verdict ?? "student_written",
    };
  } catch (err) {
    console.error("[checkAiGeneration]", err);
    return fallback;
  }
}

export async function checkPlagiarism(
  submissionId: string,
  code: string,
  moduleId: number,
  studentId: string
): Promise<PlagiarismCheckResult | null> {
  const settings = await fetchSafetySettings();
  if (!settings.plagiarismDetectionEnabled || !code.trim()) return null;

  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();

  const { data: others } = await admin
    .from("submissions")
    .select("id, student_id, content_url")
    .eq("module_id", moduleId)
    .neq("id", submissionId);

  const matched: PlagiarismCheckResult["matched_submissions"] = [];
  let maxSimilarity = 0;

  for (const sub of others ?? []) {
    if (sub.student_id === studentId) continue;
    const otherCode = extractCodeFromContent(sub.content_url);
    if (!otherCode.trim()) continue;

    const score = similarityScore(code, otherCode);
    if (score > 0.5) {
      matched.push({
        submission_id: sub.id,
        student_id: sub.student_id,
        score: Math.round(score * 100) / 100,
      });
    }
    if (score > maxSimilarity) maxSimilarity = score;
  }

  matched.sort((a, b) => b.score - a.score);

  const aiCheck = await checkAiGeneration(code);

  const flagged =
    maxSimilarity > settings.similarityThreshold ||
    aiCheck.ai_generated_probability > settings.aiGenerationThreshold;

  const result: PlagiarismCheckResult = {
    similarity_score: Math.round(maxSimilarity * 100) / 100,
    matched_submissions: matched.slice(0, 5),
    ai_generated_probability: aiCheck.ai_generated_probability,
    ai_indicators: aiCheck.indicators,
    ai_verdict: aiCheck.verdict,
    flagged,
  };

  await admin.from("plagiarism_checks").insert({
    submission_id: submissionId,
    student_id: studentId,
    module_id: moduleId,
    similarity_score: result.similarity_score,
    matched_submissions: result.matched_submissions,
    ai_generated_probability: result.ai_generated_probability,
    flagged,
  });

  if (flagged) {
    if (maxSimilarity > settings.similarityThreshold) {
      await createSafetyFlag({
        studentId,
        flagType: "plagiarism",
        severity: maxSimilarity > 0.95 ? "high" : "medium",
        source: "submission",
        contentSnippet: code.slice(0, 200),
        details: {
          submission_id: submissionId,
          similarity_score: result.similarity_score,
          matched: result.matched_submissions,
        },
      });
    }

    if (aiCheck.ai_generated_probability > settings.aiGenerationThreshold) {
      await createSafetyFlag({
        studentId,
        flagType: "ai_generated_code",
        severity:
          aiCheck.ai_generated_probability > 0.9 ? "high" : "medium",
        source: "submission",
        contentSnippet: code.slice(0, 200),
        details: {
          submission_id: submissionId,
          probability: aiCheck.ai_generated_probability,
          indicators: aiCheck.indicators,
          verdict: aiCheck.verdict,
        },
      });
    }
  }

  return result;
}

export async function fetchPlagiarismCheck(
  submissionId: string
): Promise<PlagiarismCheckResult | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("plagiarism_checks")
    .select("*")
    .eq("submission_id", submissionId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    similarity_score: data.similarity_score ?? 0,
    matched_submissions: (data.matched_submissions as PlagiarismCheckResult["matched_submissions"]) ?? [],
    ai_generated_probability: data.ai_generated_probability ?? 0,
    ai_indicators: [],
    ai_verdict:
      (data.ai_generated_probability ?? 0) > 0.8
        ? "likely_ai"
        : "student_written",
    flagged: Boolean(data.flagged),
  };
}
