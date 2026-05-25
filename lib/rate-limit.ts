type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfterSec: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return Response.json(
    { error: `Rate limit exceeded. Try again in ${retryAfterSec}s.` },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

export const RATE_LIMITS = {
  tutorChat: { limit: 10, windowMs: 60_000 },
  missionSubmit: { limit: 5, windowMs: 60_000 },
  generate3d: { limit: 3, windowMs: 60_000 },
  loginXp: { limit: 1, windowMs: 60_000 },
} as const;

export function userRateLimitKey(
  userId: string,
  endpoint: string
): string {
  return `${endpoint}:${userId}`;
}
