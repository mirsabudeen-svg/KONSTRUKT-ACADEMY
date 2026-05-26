import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  CLERK_SUPABASE_JWT_TEMPLATE,
  getSupabaseKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

type ClerkGetToken = (options: {
  template: string;
}) => Promise<string | null>;

/**
 * Browser Supabase client authenticated via Clerk JWT.
 *
 * Usage in a client component:
 *   const { getToken } = useAuth();
 *   const supabase = await createSupabaseBrowserClient(getToken);
 */
export async function createSupabaseBrowserClient(
  getToken: ClerkGetToken
): Promise<SupabaseClient> {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or Supabase publishable/anon key"
    );
  }

  const supabaseToken = await getToken({
    template: CLERK_SUPABASE_JWT_TEMPLATE,
  });

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
