import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  CLERK_SUPABASE_JWT_TEMPLATE,
  getSupabaseKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export { isSupabaseConfigured, CLERK_SUPABASE_JWT_TEMPLATE };

async function getClerkSupabaseToken(): Promise<string | null> {
  const { getToken } = await auth();

  try {
    return await getToken({ template: CLERK_SUPABASE_JWT_TEMPLATE });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("JWT template not found")) {
      console.error(
        `[supabase] Clerk JWT template "${CLERK_SUPABASE_JWT_TEMPLATE}" not found. ` +
          "Create it in Clerk Dashboard → JWT Templates and set the Supabase JWT secret as the signing key. " +
          "See supabase/SETUP.md section 3."
      );
    }

    throw error;
  }
}

/**
 * Server-side Supabase client authenticated with the signed-in Clerk user's JWT.
 * RLS policies use auth.uid() = Clerk user id via the "supabase" JWT template.
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
