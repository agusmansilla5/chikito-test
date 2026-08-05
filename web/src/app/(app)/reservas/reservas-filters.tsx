'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { VENUE_OPTIONS } from '@/lib/types';

const fieldClass =
  'rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700';

export function ReservasFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <select value={searchParams.get('venue') ?? 'all'} onChange={(e) => setParam('venue', e.target.value)} className={fieldClass}>
        <option value="all">Todas las sedes</option>
        {VENUE_OPTIONS.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        aria-label="Desde"
        value={searchParams.get('from') ?? ''}
        onChange={(e) => setParam('from', e.target.value)}
        className={fieldClass}
      />
      <input
        type="date"
        aria-label="Hasta"
        value={searchParams.get('to') ?? ''}
        onChange={(e) => setParam('to', e.target.value)}
        className={fieldClass}
      />
      <input
        type="search"
        placeholder="Buscar por nombre o teléfono..."
        defaultValue={searchParams.get('search') ?? ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setParam('search', e.currentTarget.value);
        }}
        onBlur={(e) => setParam('search', e.currentTarget.value)}
        className={`${fieldClass} min-w-[220px]`}
      />
    </div>
  );
}
