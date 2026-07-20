'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Location } from '@/lib/types';
import { setLocation } from './locations/actions';

export function LocationSwitcher({
  locations,
  selectedId,
}: {
  locations: Location[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (locations.length === 0) return null;

  if (locations.length === 1) {
    return (
      <div className="px-3 py-2 text-sm font-medium text-foreground">
        📍 {locations[0].name}
      </div>
    );
  }

  function handleChange(id: string) {
    startTransition(async () => {
      await setLocation(id);
      router.refresh();
    });
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm font-medium text-foreground focus:border-accent focus:outline-none disabled:opacity-50 dark:border-zinc-700"
    >
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          📍 {l.name}
        </option>
      ))}
    </select>
  );
}
