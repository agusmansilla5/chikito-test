'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Location, Profile } from '@/lib/types';
import { LogoutButton } from './logout-button';
import { LocationSwitcher } from './location-switcher';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Panel de control',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6"
      />
    ),
  },
  {
    href: '/movement',
    label: 'Registrar movimiento',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    ),
  },
  {
    href: '/products',
    label: 'Productos',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5 12 3 3.75 7.5m16.5 0-8.25 4.5m8.25-4.5v9L12 21m0-9L3.75 7.5m8.25 9L3.75 12v-4.5"
      />
    ),
  },
  {
    href: '/audits',
    label: 'Auditorías',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Zm3 9 2.25 2.25 4.5-4.5"
      />
    ),
  },
  {
    href: '/purchase-orders',
    label: 'Órdenes de compra',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.928 2.446-7.706a1.125 1.125 0 0 0-1.11-1.313H5.106M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    ),
  },
  {
    href: '/suppliers',
    label: 'Proveedores',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15l-.75 6h-13.5L4.5 3Zm.75 6v12m13.5-12v12M9 21v-4.5a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5V21"
      />
    ),
  },
  {
    href: '/settings',
    label: 'Configuración',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.164.397.505.71.93.78l.893.15c.542.09.94.56.94 1.109v1.094c0 .55-.398 1.02-.94 1.11l-.893.149c-.425.07-.766.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    ),
  },
  {
    href: '/locations',
    label: 'Ubicaciones',
    adminOnly: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    ),
  },
];

export function Sidebar({
  profile,
  locations,
  selectedLocationValue,
  onNavigate,
}: {
  profile: Profile;
  locations: Location[];
  selectedLocationValue: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || profile.role === 'admin');

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-zinc-200 bg-surface dark:border-zinc-800">
      <div className="flex items-center gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-700">
          CS
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Control de Stock</p>
        </div>
      </div>

      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <LocationSwitcher
          locations={locations}
          selectedValue={selectedLocationValue}
          isAdmin={profile.role === 'admin'}
        />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="h-5 w-5 shrink-0"
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <p className="truncate text-sm font-medium text-foreground">{profile.full_name}</p>
        <p className="mb-3 text-xs capitalize text-foreground">{profile.role}</p>
        <LogoutButton />
      </div>
    </aside>
  );
}
