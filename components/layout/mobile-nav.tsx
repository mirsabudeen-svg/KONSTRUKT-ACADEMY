"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Home, Target, Trophy, User } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/settings", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-500/20 bg-zinc-950/95 backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-stretch justify-around px-1 py-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] transition-colors",
                  active
                    ? "text-cyan-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden />
                <span>{label}</span>
                {active && (
                  <span className="h-0.5 w-6 rounded-full bg-cyan-400" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
