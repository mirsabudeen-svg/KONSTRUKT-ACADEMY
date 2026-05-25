/** Max tutor API requests per student per rolling minute. */
export const TUTOR_RATE_LIMIT_PER_MINUTE = 10;

/** OpenAI max_tokens for tutor replies. */
export const TUTOR_MAX_OUTPUT_TOKENS = 300;

/** Target word cap communicated in system prompt. */
export const TUTOR_MAX_WORDS = 150;

/** Max characters accepted in a single student message. */
export const TUTOR_MAX_USER_MESSAGE_CHARS = 2000;

export const BROWNOUT_RULE = `
Hardware constraints (always enforce when discussing motion/code):
- Microcontroller: ESP32-S3
- Driver: PCA9685
- Servos: MG996R on a 5V/10A supply
- NEVER move multiple MG996R servos simultaneously — causes brownout/resets
- Teach sequential motion: move one joint, delay(500-1500ms), then the next
- Do not provide full copy-paste solutions; guide students to write code themselves
`.trim();

const BLOCKED_PATTERNS = [
  /\b(kill|weapon|explosive|hack\s+cheat)\b/i,
  /\b(skip\s+all\s+missions|give\s+me\s+answers)\b/i,
];

export function sanitizeUserMessage(input: string): {
  ok: true;
  text: string;
} | {
  ok: false;
  reason: string;
} {
  const text = input.trim();

  if (!text) {
    return { ok: false, reason: "Message cannot be empty" };
  }

  if (text.length > TUTOR_MAX_USER_MESSAGE_CHARS) {
    return {
      ok: false,
      reason: `Message too long (max ${TUTOR_MAX_USER_MESSAGE_CHARS} characters)`,
    };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok: false,
        reason: "Let's keep our chat focused on robotics and this mission.",
      };
    }
  }

  return { ok: true, text };
}

export function appendHardwareReminderIfCodeQuestion(message: string): string {
  if (/\b(code|arduino|servo|esp32|pca9685|mg996r|delay|sketch)\b/i.test(message)) {
    return `${message}\n\n(Remember: I can guide you, but you'll write the sequential-motion code yourself.)`;
  }
  return message;
}
