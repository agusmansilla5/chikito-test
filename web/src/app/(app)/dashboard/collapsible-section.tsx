'use client';

import { useState, type ReactNode } from 'react';

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-8 rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <span className="text-foreground">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">{children}</div>}
    </section>
  );
}
