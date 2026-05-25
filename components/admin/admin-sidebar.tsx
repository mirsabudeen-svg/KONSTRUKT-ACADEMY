"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Coins,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  Target,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: BarChart3, emoji: "📊" },
      { href: "/admin/curriculum", label: "Curriculum", icon: Brain, emoji: "🧠" },
      { href: "/admin/tokens", label: "Tokens", icon: Coins, emoji: "🪙" },
      { href: "/admin/students", label: "Students", icon: Users, emoji: "👥" },
      { href: "/admin/cohorts", label: "Cohorts", icon: GraduationCap, emoji: "🏫" },
      { href: "/admin/reports", label: "Reports", icon: FileText, emoji: "📋" },
      {
        href: "/admin/communications",
        label: "Communications",
        icon: MessageSquare,
        emoji: "💬",
      },
      { href: "/admin/safety", label: "Safety", icon: Shield, emoji: "🛡️" },
      { href: "/admin/settings", label: "Settings", icon: Settings, emoji: "⚙️" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/admin/aria", label: "ARIA Assistant", icon: Bot, emoji: "🤖" },
      {
        href: "/admin/aria/health",
        label: "System Health",
        icon: Activity,
        emoji: "💊",
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/maia", label: "MAIA Marketing", icon: Target, emoji: "🎯" },
      {
        href: "/admin/maia/library",
        label: "Content Library",
        icon: BookOpen,
        emoji: "📚",
      },
      {
        href: "/admin/maia/campaigns",
        label: "Campaigns",
        icon: Megaphone,
        emoji: "📣",
      },
      {
        href: "/admin/maia/broadcast",
        label: "Broadcasts",
        icon: Radio,
        emoji: "📡",
      },
      {
        href: "/admin/maia/analytics",
        label: "Marketing Analytics",
        icon: BarChart3,
        emoji: "📊",
      },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/aria") return pathname === "/admin/aria";
  if (href === "/admin/maia") return pathname === "/admin/maia";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-orange-500/60">
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30"
                      : "text-muted-foreground hover:bg-orange-500/5 hover:text-orange-200"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span>
                    {item.emoji} {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
