import { Bell, BriefcaseBusiness, HelpCircle, LayoutDashboard, Search, Settings, Sparkles, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  { label: "Candidates", href: "/candidates/cand-maya", icon: UsersRound },
  { label: "Settings", href: "/", icon: Settings }
];

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-sand text-navy">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-line bg-white/80 lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-line px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <Link href="/" className="text-xl font-black leading-none text-ink">
                Shortlist
              </Link>
              <p className="mt-1 text-xs font-bold uppercase text-navy/50">AI HR Partner</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-navy/75 transition hover:bg-moss/20 hover:text-ink"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t border-line p-3">
            <Link className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-navy/70 hover:bg-moss/20" href="/">
              <HelpCircle className="h-5 w-5" />
              Support
            </Link>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
              <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 rounded-full bg-moss/15 px-4 py-2 text-sm text-navy/55 sm:flex">
                <Search className="h-5 w-5 shrink-0" />
                <span className="truncate">Search candidates or roles...</span>
              </div>
              <Link href="/" className="flex items-center gap-2 font-black text-ink sm:hidden">
                <Sparkles className="h-5 w-5" />
                Shortlist
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-ink/15 bg-clay/45 px-3 py-1.5 text-xs font-black uppercase text-ink sm:flex">
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
                <p className="mt-3 max-w-2xl text-base leading-7 text-navy/65">{description}</p>
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
