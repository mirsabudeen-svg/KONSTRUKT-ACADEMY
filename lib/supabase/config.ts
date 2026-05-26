/** Must match the JWT template name in Clerk Dashboard exactly. */
export const CLERK_SUPABASE_JWT_TEMPLATE = "supabase";

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Supports legacy anon JWT key or newer `sb_publishable_` key from Supabase dashboard. */
export function getSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}
