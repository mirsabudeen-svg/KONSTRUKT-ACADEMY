"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

type DashboardShellClientProps = {
  sidebar: ReactNode;
  children: ReactNode;
  header?: ReactNode;
};

export function DashboardShellClient({
  sidebar,
  children,
  header,
}: DashboardShellClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <div className="flex items-center justify-between border-b border-cyan-500/10 px-4 py-3 md:px-8">
          <button
            type="button"
            className="rounded-lg border border-cyan-500/20 p-2 text-cyan-400 md:hidden"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
          <div className="flex flex-1 items-center justify-end">{header}</div>
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
