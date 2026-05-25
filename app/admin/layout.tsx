import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { isAdminRole } from "@/lib/auth/admin";
import { getUserRoleById } from "@/lib/auth/trainer";
import { auth } from "@clerk/nextjs/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LayoutErrorBoundary } from "@/components/error/error-boundary";
import { ToastProvider } from "@/components/ui/toast-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const role = await getUserRoleById(userId);
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/30 via-background to-background" />

      <aside className="relative z-10 hidden w-64 shrink-0 border-r border-orange-500/15 bg-sidebar/80 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col p-6">
          <Link href="/admin" className="mb-8 group">
            <span className="font-display text-lg font-bold tracking-[0.15em] text-orange-400 group-hover:text-orange-300">
              {APP_NAME}
            </span>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Admin Command
            </p>
          </Link>
          <AdminSidebar />
          <div className="mt-auto pt-6">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-full justify-start gap-2 text-muted-foreground"
              )}
            >
              <LayoutDashboard className="size-4" />
              Back to main site
            </Link>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="border-b border-orange-500/15 bg-sidebar/60 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <h1 className="font-display text-sm font-semibold tracking-wider text-orange-300">
                KONSTRUKT Admin
              </h1>
              <p className="text-[10px] text-muted-foreground lg:hidden">
                Intelligence Center
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-orange-300 sm:inline">
                admin
              </span>
              <UserButton
                appearance={{
                  elements: { avatarBox: "ring-2 ring-orange-500/40" },
                }}
              />
            </div>
          </div>
          <div className="border-t border-orange-500/10 px-4 py-2 lg:hidden">
            <AdminSidebar />
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          <LayoutErrorBoundary>
            <ToastProvider>{children}</ToastProvider>
          </LayoutErrorBoundary>
        </main>

        <footer className="border-t border-orange-500/10 px-6 py-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {APP_TAGLINE} · Admin Intelligence Center
        </footer>
      </div>
    </div>
  );
}
