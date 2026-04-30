"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "./sidebar";
import { AppTopbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
  focused?: boolean;
};

export function AppShell({ children, focused = false }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const isLiveInterviewPage = /^\/interview\/[^/]+\/live$/.test(pathname);

  useEffect(() => {
    if (isLiveInterviewPage) {
      setIsSidebarCollapsed(true);
      return;
    }

    const savedValue = window.localStorage.getItem("shortlist-sidebar-collapsed");

    if (savedValue) {
      setIsSidebarCollapsed(savedValue === "true");
    }
  }, [isLiveInterviewPage]);

  function toggleSidebar() {
    setIsSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue;

      if (!isLiveInterviewPage) {
        window.localStorage.setItem("shortlist-sidebar-collapsed", String(nextValue));
      }

      return nextValue;
    });
  }

  if (focused) {
    return (
      <main className="min-h-screen bg-sand text-navy">
        <div
          className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
            isSidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[248px_1fr]"
          }`}
        >
          <AppSidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
          <section className="min-w-0">
            <div className="w-full px-4 py-4 sm:px-5">
              {children}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand text-navy">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          isSidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[248px_1fr]"
        }`}
      >
        <AppSidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <section className="min-w-0">
          <AppTopbar />
          <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
