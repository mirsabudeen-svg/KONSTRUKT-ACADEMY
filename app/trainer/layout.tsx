import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Shield } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";
import { auth } from "@clerk/nextjs/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/40 via-background to-background" />

      <header className="relative z-10 border-b border-violet-500/15 bg-sidebar/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/trainer/dashboard" className="group">
              <span className="font-display text-lg font-bold tracking-[0.2em] text-violet-400 group-hover:text-violet-300">
                {APP_NAME}
              </span>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Trainer Command
              </p>
            </Link>
            <nav className="hidden items-center gap-2 sm:flex">
              <Link
                href="/trainer/dashboard"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-2 text-violet-300"
                )}
              >
                <Shield className="size-4" aria-hidden />
                Operations
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-2"
                )}
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Cadet View
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-violet-300 sm:inline">
              {role}
            </span>
            <UserButton
              appearance={{
                elements: { avatarBox: "ring-2 ring-violet-500/40" },
              }}
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>

      <footer className="relative z-10 border-t border-violet-500/10 px-6 py-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        {APP_TAGLINE} · Trainer Operations
      </footer>
    </div>
  );
}
