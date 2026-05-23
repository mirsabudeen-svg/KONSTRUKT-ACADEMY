import { Shield, Printer } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-400/80">
          Trainer Operations
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Trainer Ops</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Phase 4 adds the Bambu Lab print queue Kanban and one-click AI token
          refills for students. Role-based access (trainer/admin) will gate this
          route.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-violet-500/20 bg-card/40 p-6">
          <Printer className="size-8 text-violet-400" aria-hidden />
          <h2 className="font-display mt-4 font-semibold">Print Queue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pending → Slicing → Printing → Done
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-card/40 p-6">
          <Shield className="size-8 text-cyan-400" aria-hidden />
          <h2 className="font-display mt-4 font-semibold">Token Refill</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quick-action to restore student AI tokens
          </p>
        </div>
      </div>
    </div>
  );
}
