export const SAFETY_CONTEXT = `
SAFETY CONTEXT:
- You are speaking with a student aged 9-16
- Use simple, clear language
- Be encouraging and positive
- Never discuss violence, adult content, politics, or distressing topics
- If asked about non-robotics topics, gently redirect to the learning material
- Never share personal information
- Report concerning messages appropriately
`.trim();

const SCARY_PATTERNS = [
  /\b(kill|murder|blood|gore|weapon|bomb|explosion)\b/i,
  /\b(death|die|suicide|self-harm)\b/i,
];

const JARGON_WITHOUT_EXPLANATION =
  /\b(polymorphism|heterogeneous|quantum|cryptographic)\b/i;

export function buildSafeSystemPrompt(basePrompt: string): string {
  return `${basePrompt.trim()}\n\n${SAFETY_CONTEXT}`;
}

export function filterAIResponse(
  response: string,
  _studentAge?: number
): string {
  let filtered = response;

  for (const pattern of SCARY_PATTERNS) {
    if (pattern.test(filtered)) {
      filtered = filtered.replace(
        pattern,
        "[topic removed — let's focus on robotics]"
      );
    }
  }

  if (JARGON_WITHOUT_EXPLANATION.test(filtered)) {
    filtered = `${filtered}\n\n(Let me know if any words were confusing — I'm happy to explain in simpler terms!)`;
  }

  if (filtered.length > 4000) {
    filtered = `${filtered.slice(0, 4000)}…`;
  }

  return filtered;
}
