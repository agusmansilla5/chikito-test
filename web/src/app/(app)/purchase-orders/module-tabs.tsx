'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/purchase-orders', label: 'Pedidos' },
  { href: '/suppliers', label: 'Proveedores' },
];

export function ModuleTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active ? 'border-accent text-accent' : 'border-transparent text-foreground hover:text-accent'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
