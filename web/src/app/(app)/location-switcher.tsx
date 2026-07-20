'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Location } from '@/lib/types';
import { ALL_LOCATIONS_VALUE } from '@/lib/location-constants';
import { setLocation } from './locations/actions';

export function LocationSwitcher({
  locations,
  selectedValue,
}: {
  locations: Location[];
  selectedValue: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (locations.length === 0) return null;

  function handleChange(value: string) {
    startTransition(async () => {
      await setLocation(value);
      router.refresh();
    });
  }

  return (
    <select
      value={selectedValue ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm font-medium text-foreground focus:border-accent focus:outline-none disabled:opacity-50 dark:border-zinc-700"
    >
      <option value={ALL_LOCATIONS_VALUE}>🏠 General (todos los locales)</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          📍 {l.name}
        </option>
      ))}
    </select>
  );
}
