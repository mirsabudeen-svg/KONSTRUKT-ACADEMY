import { AppSidebar } from "@/components/app-sidebar";
import { getTokensRemaining } from "@/lib/tokens";

export async function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const tokens = await getTokensRemaining();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-background to-background" />
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSg2LDE4MiwxOTgsMC4wNCkiIHN0cm9rZS13aWR0aD0iLjUiLz48L2c+PC9zdmc+')] opacity-40" />

      <AppSidebar tokens={tokens} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {(title || subtitle) && (
          <header className="border-b border-cyan-500/10 px-8 py-6">
            {title && (
              <h1 className="font-display text-2xl font-bold tracking-wide text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </header>
        )}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
