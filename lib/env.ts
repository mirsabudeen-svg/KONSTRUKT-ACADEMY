import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_MESHY_API_KEY: z.string().optional(),
  MESHY_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);

  if (!result.success && process.env.NODE_ENV === "production") {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    console.error("[env] Missing or invalid environment variables:", missing);
  }

  cached = result.success
    ? result.data
    : (process.env as unknown as Env);

  return cached;
}

export function validateEnvOnStartup(): void {
  if (process.env.NODE_ENV !== "production") return;
  getEnv();
}
