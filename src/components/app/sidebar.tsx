import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Brand } from "./brand";
import { navItems, supportItem } from "./nav-items";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <aside className="hidden border-r border-line bg-white/80 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:self-start">
      <div className={`flex items-center border-b border-line ${collapsed ? "h-24 flex-col justify-center gap-2 px-2" : "h-16 gap-3 px-4"}`}>
        <div className={collapsed ? "sr-only" : "min-w-0 flex-1"}>
          <Brand />
        </div>
        {collapsed ? <Brand compact /> : null}
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`${collapsed ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl"} flex shrink-0 items-center justify-center border border-ink/10 bg-paper text-navy/70 transition hover:border-ink/25 hover:bg-moss/20 hover:text-ink`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className={`flex-1 py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl py-3 text-sm font-bold text-navy/75 transition hover:bg-moss/20 hover:text-ink ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <Link
          aria-label={supportItem.label}
          className={`flex items-center rounded-xl py-3 text-sm font-bold text-navy/70 hover:bg-moss/20 ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
          href={supportItem.href}
          title={collapsed ? supportItem.label : undefined}
        >
          <supportItem.icon className="h-5 w-5" />
          {collapsed ? <span className="sr-only">{supportItem.label}</span> : supportItem.label}
        </Link>
      </div>
    </aside>
  );
}
