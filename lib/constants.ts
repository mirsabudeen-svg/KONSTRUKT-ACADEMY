import {
  Award,
  LayoutDashboard,
  Rocket,
  Settings,
  Terminal,
  Shield,
  ClipboardList,
  Trophy,
  Target,
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
    title: "My Badges",
    href: "/badges",
    icon: Award,
    description: "Earned achievements & rank",
  },
  {
    title: "AI Terminal",
    href: "/ai-terminal",
    icon: Terminal,
    description: "Code & 3D generation",
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
    description: "Cohort XP rankings",
  },
  {
    title: "Challenges",
    href: "/challenges",
    icon: Target,
    description: "Bonus XP missions",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Profile & parent contacts",
  },
];

export const TRAINER_NAV: NavItem = {
  title: "Trainer Ops",
  href: "/trainer/dashboard",
  icon: Shield,
  description: "Print queue & token refills",
};

export const TRAINER_SUBMISSIONS_NAV: NavItem = {
  title: "Submissions",
  href: "/trainer/submissions",
  icon: ClipboardList,
  description: "Review pending cadet work",
};

export const TRAINER_CHALLENGES_NAV: NavItem = {
  title: "Challenges",
  href: "/trainer/challenges",
  icon: Target,
  description: "Create cohort challenges",
};

/** @deprecated Use TRAINER_NAV */
export const ADMIN_NAV = TRAINER_NAV;

export const APP_NAME = "KONSTRUKT";
export const APP_TAGLINE = "Robotics Academy";
