import {
  LayoutDashboard,
  Rocket,
  Terminal,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const MAIN_NAV: NavItem[] = [
  {
    title: "Command Center",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Your mission overview",
  },
  {
    title: "Missions",
    href: "/missions",
    icon: Rocket,
    description: "10-step robotics curriculum",
  },
  {
    title: "AI Terminal",
    href: "/ai-terminal",
    icon: Terminal,
    description: "Code & 3D generation",
  },
];

export const ADMIN_NAV: NavItem = {
  title: "Trainer Ops",
  href: "/admin",
  icon: Shield,
  description: "Print queue & token refills",
};

export const APP_NAME = "KONSTRUKT";
export const APP_TAGLINE = "Robotics Academy";
