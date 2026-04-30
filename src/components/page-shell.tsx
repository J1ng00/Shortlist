import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { PageHeading } from "@/components/app/page-heading";

type PageShellProps = {
  eyebrow?: string;
  prefix?: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  focused?: boolean;
};

export function PageShell({ eyebrow, prefix, title, description, actions, children, focused = false }: PageShellProps) {
  if (focused) {
    return (
      <AppShell focused>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {prefix ? <div className="mb-2">{prefix}</div> : null}
            {eyebrow ? <p className="text-xs font-black uppercase text-ink">{eyebrow}</p> : null}
            <h1 className="truncate text-2xl font-black text-navy">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-navy/65">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell focused={focused}>
      <PageHeading
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        prefix={prefix}
        title={title}
      />
      {children}
    </AppShell>
  );
}
