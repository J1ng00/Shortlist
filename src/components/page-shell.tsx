import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeading } from "@/components/app/page-heading";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <AppShell>
      <PageHeading
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      {children}
    </AppShell>
  );
}
