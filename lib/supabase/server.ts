import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabaseKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export { isSupabaseConfigured };

async function getClerkSupabaseToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}

/**
 * Server-side Supabase client authenticated with the signed-in Clerk session token.
 * Uses Clerk's native Supabase integration — no named JWT template required.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) return null;

  const supabaseToken = await getClerkSupabaseToken();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: supabaseToken
      ? {
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
          },
        }
      : undefined,
  });
}
