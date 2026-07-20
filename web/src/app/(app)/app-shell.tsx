'use client';

import { useState, type ReactNode } from 'react';
import type { Location, Profile } from '@/lib/types';
import { Sidebar } from './sidebar';

export function AppShell({
  profile,
  locations,
  selectedLocationValue,
  children,
}: {
  profile: Profile;
  locations: Location[];
  selectedLocationValue: string | null;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Barra superior: solo en pantallas chicas */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-surface px-4 py-3 md:hidden dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="text-foreground"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
        <p className="truncate text-sm font-semibold text-foreground">Control de Stock</p>
      </div>

      {/* Fondo oscuro detrás del menú, solo en pantallas chicas */}
      {navOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <div className="flex w-full">
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            profile={profile}
            locations={locations}
            selectedLocationValue={selectedLocationValue}
            onNavigate={() => setNavOpen(false)}
          />
        </div>

        <main className="w-full min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
