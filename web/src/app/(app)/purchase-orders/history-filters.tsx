'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Supplier } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pendiente_envio', label: 'Pendiente de envío' },
  { value: 'recibida', label: 'Recibida' },
  { value: 'cancelada', label: 'Cancelada' },
];

const selectClass =
  'rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700';

export function HistoryFilters({ suppliers }: { suppliers: Supplier[] }) {
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
      <select value={searchParams.get('status') ?? 'all'} onChange={(e) => setParam('status', e.target.value)} className={selectClass}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select value={searchParams.get('supplier') ?? 'all'} onChange={(e) => setParam('supplier', e.target.value)} className={selectClass}>
        <option value="all">Todos los proveedores</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        aria-label="Desde"
        value={searchParams.get('from') ?? ''}
        onChange={(e) => setParam('from', e.target.value)}
        className={selectClass}
      />
      <input
        type="date"
        aria-label="Hasta"
        value={searchParams.get('to') ?? ''}
        onChange={(e) => setParam('to', e.target.value)}
        className={selectClass}
      />
    </div>
  );
}
