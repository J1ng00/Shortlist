import Link from "next/link";
import { Bell, ChevronDown, Menu, UserRound } from "lucide-react";

import { Brand } from "./brand";
import { navItems, supportItem } from "./nav-items";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/15 bg-paper/90 shadow-[0_1px_0_rgba(60,87,143,0.08)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-ink/25 bg-white px-3 py-2 text-sm font-black text-ink shadow-panel transition hover:border-ink/45 hover:bg-clay/40 [&::-webkit-details-marker]:hidden">
            <Menu className="h-4 w-4" />
            Dashboard
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 top-12 z-30 w-64 rounded-2xl border border-ink/20 bg-paper p-2 shadow-strong">
            {[...navItems, supportItem].map((item) => (
              <Link
                key={item.label}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-navy/75 transition hover:bg-clay/50 hover:text-ink"
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
          <div className="hidden items-center gap-2 rounded-full border border-ink/20 bg-white px-3 py-1.5 text-xs font-black uppercase text-ink shadow-panel sm:flex">
            <span className="animate-shortlist-dot h-2 w-2 rounded-full bg-clay ring-1 ring-ink/25" />
            AI Copilot: Online
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-white text-navy/75 transition hover:bg-clay/45 hover:text-ink" type="button">
            <Bell className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper shadow-panel transition hover:bg-navy" type="button">
            <UserRound className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
