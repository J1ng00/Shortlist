import Link from "next/link";
import { Bell, ChevronDown, Menu, UserRound } from "lucide-react";

import { Brand } from "./brand";
import { navItems, supportItem } from "./nav-items";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2 text-sm font-black text-ink transition hover:border-ink/30 [&::-webkit-details-marker]:hidden">
            <Menu className="h-4 w-4" />
            Dashboard
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 top-12 z-30 w-64 rounded-2xl border border-line bg-paper p-2 shadow-panel">
            {[...navItems, supportItem].map((item) => (
              <Link
                key={item.label}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-navy/75 transition hover:bg-moss/20 hover:text-ink"
                href={item.href}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        <div className="sm:hidden">
          <Brand compact />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-ink/15 bg-clay/45 px-3 py-1.5 text-xs font-black uppercase text-ink sm:flex">
            <span className="h-2 w-2 rounded-full bg-ink" />
            AI Copilot: Online
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-navy/70" type="button">
            <Bell className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper" type="button">
            <UserRound className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
