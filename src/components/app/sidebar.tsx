import Link from "next/link";

import { Brand } from "./brand";
import { navItems, supportItem } from "./nav-items";

export function AppSidebar() {
  return (
    <aside className="hidden border-r border-line bg-white/80 lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Brand />
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
        <Link className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-navy/70 hover:bg-moss/20" href={supportItem.href}>
          <supportItem.icon className="h-5 w-5" />
          {supportItem.label}
        </Link>
      </div>
    </aside>
  );
}
