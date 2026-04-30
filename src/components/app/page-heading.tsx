import type { ReactNode } from "react";

type PageHeadingProps = {
  eyebrow?: string;
  prefix?: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
};

export function PageHeading({ eyebrow, prefix, title, description, actions }: PageHeadingProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {prefix ? <div className="mb-4">{prefix}</div> : null}
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
  );
}
