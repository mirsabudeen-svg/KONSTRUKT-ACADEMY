import { AiTerminal } from "@/components/ai-terminal/ai-terminal";
import { TokenBadge } from "@/components/token-badge";
import { getTokensRemaining } from "@/lib/tokens";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AiTerminalPage() {
  const tokens = await getTokensRemaining();
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-violet-400/80">
            AI Terminal
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">
            Kontraktor Command Link
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Stream engineering guidance from Claude. Arm code follows the
            Brownout Rule — sequential MG996R motion only. Each generation costs
            1 AI token.
          </p>
        </div>
        <TokenBadge />
      </div>

      <AiTerminal
        initialTokens={tokens}
        supabaseConfigured={supabaseConfigured}
      />
    </div>
  );
}
