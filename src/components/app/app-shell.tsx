import type { ReactNode } from "react";

import { AppSidebar } from "./sidebar";
import { AppTopbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-sand text-navy">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <AppSidebar />
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
