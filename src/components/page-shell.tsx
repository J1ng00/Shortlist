import { Bell, BriefcaseBusiness, HelpCircle, LayoutDashboard, Search, Settings, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/ui";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Roles", href: "/jobs/new", icon: BriefcaseBusiness },
  { label: "Candidates", href: "/jobs/job-ops-coordinator/upload", icon: UsersRound },
  { label: "Settings", href: "/", icon: Settings }
];

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-sand text-navy">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-ink/20 bg-ink text-paper lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-paper/15 px-5">
            <BrandMark inverted />
            <div>
              <Link href="/" className="text-2xl font-black uppercase leading-none text-paper">
                SHORTLIST
              </Link>
              <p className="mt-1 text-xs font-bold uppercase text-paper/50">AI HR Partner</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-paper/75 transition hover:bg-paper/10 hover:text-paper"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <Link className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-paper/70 hover:bg-paper/10 hover:text-paper" href="/">
              <HelpCircle className="h-5 w-5" />
              Support
            </Link>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
              <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 rounded-full border border-line bg-sand px-4 py-2 text-sm text-navy/55 sm:flex">
                <Search className="h-5 w-5 shrink-0" />
                <span className="truncate">Search candidates or roles...</span>
              </div>
              <Link href="/" className="flex items-center gap-2 font-black text-ink sm:hidden">
                <BrandMark size="sm" />
                SHORTLIST
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-ink/15 bg-moss/20 px-3 py-1.5 text-xs font-black uppercase text-ink sm:flex">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                  AI Copilot: Online
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-navy/70">
                  <Bell className="h-4 w-4" />
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper">
                  <UserRound className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                {eyebrow ? (
                  <p className="mb-3 text-xs font-black uppercase text-ink">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="text-3xl font-black text-navy sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-navy/70">{description}</p>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
