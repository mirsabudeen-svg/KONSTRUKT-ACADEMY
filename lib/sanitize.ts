import DOMPurify from "dompurify";

/** Strip HTML and dangerous characters from user text before DB storage. */
export function sanitizeText(input: string, maxLength = 10000): string {
  const trimmed = input.trim().slice(0, maxLength);
  if (typeof window === "undefined") {
    return trimmed
      .replace(/[<>]/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "");
  }
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
  return DOMPurify.sanitize(html);
}
