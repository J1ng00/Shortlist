import { BriefcaseBusiness, HelpCircle, LayoutDashboard, Settings, UsersRound } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Candidates", href: "/candidates", icon: UsersRound },
  { label: "Settings", href: "/", icon: Settings }
];

export const supportItem = { label: "Support", href: "/", icon: HelpCircle };
