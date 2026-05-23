import { getCurrentDbUser } from "@/lib/user";

const DEFAULT_TOKENS = 10;

export async function getTokensRemaining(): Promise<number> {
  const user = await getCurrentDbUser();
  if (user) return user.tokens_remaining;
  return DEFAULT_TOKENS;
}
