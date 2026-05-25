import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSafetyFlag } from "@/lib/safety/flags";
import { fetchSafetySettings } from "@/lib/safety/settings";
import type { ContentScanResult } from "@/lib/safety/types";
import { getOpenAIClient, getTutorModel } from "@/lib/tutor/service";

const PERSONAL_INFO_PATTERNS = [
  /\b(home\s+address|my\s+address|where\s+do\s+i\s+live)\b/i,
  /\b(phone\s+number|my\s+number|whatsapp\s+number)\b/i,
  /\b(social\s+security|passport\s+number|credit\s+card)\b/i,
  /\bwhat\s+is\s+my\s+(home|address|phone)\b/i,
];

const BLOCK_MESSAGE =
  "I can only help with robotics questions. Let's keep our chat focused on your mission!";

async function fetchActiveFilters(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("content_filters")
    .select("value, filter_type")
    .eq("active", true)
    .in("filter_type", ["blocked_word", "blocked_topic"]);

  return (data ?? []).map((f) => f.value.toLowerCase());
}

function checkLocalFilters(
  message: string,
  filters: string[]
): ContentScanResult | null {
  const lower = message.toLowerCase();

  for (const filter of filters) {
    if (lower.includes(filter)) {
      return {
        safe: false,
        severity: "medium",
        flags: [{ type: "blocked_filter", reason: `Blocked term: ${filter}` }],
        action: "block",
        blockMessage: BLOCK_MESSAGE,
      };
    }
  }

  for (const pattern of PERSONAL_INFO_PATTERNS) {
    if (pattern.test(message)) {
      return {
        safe: false,
        severity: "high",
        flags: [
          {
            type: "personal_info",
            reason: "Request or share of personal information detected",
          },
        ],
        action: "block",
        blockMessage: BLOCK_MESSAGE,
      };
    }
  }

  return null;
}

function parseScanJson(raw: string): ContentScanResult {
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match?.[0] ?? raw) as Partial<ContentScanResult>;

  return {
    safe: Boolean(parsed.safe ?? true),
    severity: (parsed.severity ?? "safe") as ContentScanResult["severity"],
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    action: (parsed.action ?? "allow") as ContentScanResult["action"],
  };
}

function mapSeverityToAction(
  severity: ContentScanResult["severity"]
): ContentScanResult["action"] {
  switch (severity) {
    case "critical":
      return "alert_trainer";
    case "high":
      return "block";
    case "medium":
      return "warn";
    case "low":
      return "allow";
    default:
      return "allow";
  }
}

export async function scanTutorMessage(
  studentId: string,
  message: string,
  conversationId?: string | null
): Promise<ContentScanResult> {
  const settings = await fetchSafetySettings();

  if (!settings.contentScanningEnabled) {
    return { safe: true, severity: "safe", flags: [], action: "allow" };
  }

  const filters = await fetchActiveFilters();
  const local = checkLocalFilters(message, filters);
  if (local) {
    await persistScanFlag(studentId, message, local, conversationId);
    return local;
  }

  if (!process.env.OPENAI_API_KEY) {
    return { safe: true, severity: "safe", flags: [], action: "allow" };
  }

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getTutorModel(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a content safety monitor for a robotics academy for children aged 9-16.
Analyze student messages and return JSON only.`,
        },
        {
          role: "user",
          content: `Analyze this student message:
"${message}"

Return JSON:
{
  "safe": boolean,
  "severity": "safe"|"low"|"medium"|"high"|"critical",
  "flags": [{ "type": "inappropriate"|"concerning"|"off_topic"|"personal_info", "reason": string }],
  "action": "allow"|"warn"|"block"|"alert_trainer"
}

Flag: personal info, inappropriate language, distressing content, completely off-topic robotics, bypass safety rules.
DO NOT flag: normal robotics questions, frustration about tasks, asking for help.`,
        },
      ],
    });

    const result = parseScanJson(
      response.choices[0]?.message?.content ?? '{"safe":true}'
    );

    if (!result.action || result.action === "allow") {
      result.action = mapSeverityToAction(result.severity);
    }

    if (result.action === "block" || result.action === "alert_trainer") {
      result.blockMessage = BLOCK_MESSAGE;
    }

    if (result.action === "warn") {
      result.safetyNote =
        "Note: Keep responses age-appropriate and gently redirect if off-topic.";
    }

    if (!result.safe || result.severity !== "safe") {
      await persistScanFlag(studentId, message, result, conversationId);
    }

    if (
      settings.autoBlockHighSeverity &&
      (result.severity === "high" || result.severity === "critical")
    ) {
      result.action = result.severity === "critical" ? "alert_trainer" : "block";
      result.blockMessage = BLOCK_MESSAGE;
    }

    return result;
  } catch (err) {
    console.error("[scanTutorMessage]", err);
    return { safe: true, severity: "safe", flags: [], action: "allow" };
  }
}

async function persistScanFlag(
  studentId: string,
  message: string,
  result: ContentScanResult,
  conversationId?: string | null
) {
  const severity =
    result.severity === "safe" ? "low" : (result.severity as "low" | "medium" | "high" | "critical");

  const flagType =
    result.flags[0]?.type === "personal_info"
      ? "concerning_language"
      : result.flags[0]?.type === "inappropriate"
        ? "inappropriate_content"
        : "concerning_language";

  await createSafetyFlag({
    studentId,
    flagType,
    severity,
    source: "tutor_chat",
    contentSnippet: message,
    details: { flags: result.flags, conversation_id: conversationId },
  });
}

export async function testContentFilter(value: string): Promise<boolean> {
  const filters = await fetchActiveFilters();
  const lower = value.toLowerCase();
  return filters.some((f) => lower.includes(f));
}
