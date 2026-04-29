import { Bell, Search, UserRound } from "lucide-react";

import { Brand } from "./brand";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
        <form action="/candidates" className="hidden min-w-0 max-w-md flex-1 items-center gap-3 rounded-full bg-moss/15 px-4 py-2 text-sm text-navy/55 sm:flex">
          <Search className="h-5 w-5 shrink-0" />
          <input
            className="min-w-0 flex-1 bg-transparent font-bold text-navy outline-none placeholder:text-navy/45"
            name="q"
            placeholder="Search candidates, skills, roles..."
          />
        </form>

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
