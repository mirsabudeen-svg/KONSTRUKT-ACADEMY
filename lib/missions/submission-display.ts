import type { SubmissionType } from "@/lib/db/types";

export function formatSubmittedAgo(isoDate: string): string {
  const submitted = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - submitted.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Submitted today";
  if (days === 1) return "Submitted 1 day ago";
  return `Submitted ${days} days ago`;
}

export function parseSubmissionContent(
  submissionType: SubmissionType,
  contentUrl: string | null
): { kind: "code" | "json" | "stl" | "text"; content: string; fileUrl?: string } {
  if (!contentUrl) {
    return { kind: "text", content: "(No content)" };
  }

  if (submissionType === "stl" || submissionType === "stl_file") {
    const fileUrl = extractFileUrl(contentUrl);
    return {
      kind: "stl",
      content: fileUrl ?? contentUrl,
      fileUrl: fileUrl ?? contentUrl,
    };
  }

  if (submissionType === "prompt_text") {
    try {
      const parsed = JSON.parse(contentUrl);
      return { kind: "json", content: JSON.stringify(parsed, null, 2) };
    } catch {
      return { kind: "text", content: contentUrl };
    }
  }

  if (submissionType === "code") {
    const parsed = tryParseJsonContent(contentUrl);
    if (parsed?.text) {
      return { kind: "code", content: parsed.text, fileUrl: parsed.fileUrl };
    }
    return { kind: "code", content: contentUrl };
  }

  const parsed = tryParseJsonContent(contentUrl);
  if (parsed) {
    return {
      kind: parsed.fileUrl ? "stl" : "text",
      content: parsed.text ?? contentUrl,
      fileUrl: parsed.fileUrl,
    };
  }

  return { kind: "text", content: contentUrl };
}

function tryParseJsonContent(
  raw: string
): { text?: string; fileUrl?: string } | null {
  try {
    const parsed = JSON.parse(raw) as { text?: string; fileUrl?: string };
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    /* plain text / URL */
  }
  return null;
}

function extractFileUrl(raw: string): string | null {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const parsed = tryParseJsonContent(raw);
  return parsed?.fileUrl ?? null;
}

export function submissionTypeLabel(type: SubmissionType): string {
  switch (type) {
    case "code":
      return "Code";
    case "prompt_text":
      return "Prompt text";
    case "stl":
    case "stl_file":
      return "STL file";
    case "video_demo":
      return "Video demo";
    case "quiz":
      return "Quiz";
    default:
      return type;
  }
}
