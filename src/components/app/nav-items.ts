import { BriefcaseBusiness, HelpCircle, LayoutDashboard, Settings, UsersRound } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Create role", href: "/jobs/new", icon: BriefcaseBusiness },
  { label: "Saved jobs", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Candidates", href: "/candidates", icon: UsersRound },
  { label: "Settings", href: "/", icon: Settings }
];

export const supportItem = { label: "Support", href: "/", icon: HelpCircle };
