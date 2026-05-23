import { Terminal, Lock } from "lucide-react";

import { TokenBadge } from "@/components/token-badge";
import { getTokensRemaining } from "@/lib/tokens";

export default async function AiTerminalPage() {
  const tokens = await getTokensRemaining();
  const locked = tokens <= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-violet-400/80">
            AI Terminal
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">
            Code & 3D Generation
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Phase 3 streams Claude responses via Vercel AI SDK. Arm code enforces
            sequential servo motion (Brownout Rule). Each generation costs 1
            token.
          </p>
        </div>
        <TokenBadge />
      </div>

      <div
        className={`rounded-xl border p-8 ${
          locked
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-violet-500/20 bg-card/40"
        }`}
      >
        {locked ? (
          <div className="flex flex-col items-center text-center">
            <Lock className="size-10 text-amber-400" aria-hidden />
            <p className="font-display mt-4 text-lg font-semibold text-amber-300">
              AI Tokens depleted
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Ask your Trainer for a token refill to continue generating code and
              3D models.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <Terminal className="size-10 text-violet-400" aria-hidden />
            <p className="font-display mt-4 text-lg text-muted-foreground">
              Terminal interface — Phase 3
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Prompt formula: WHAT + STYLE + DETAILS
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
