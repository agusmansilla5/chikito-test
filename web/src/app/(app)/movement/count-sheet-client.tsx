'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Unit } from '@/lib/types';
import { UNIT_OPTIONS } from '@/lib/types';
import { submitAuditCount } from './actions';

type RowState = { inicial: string; ingresos: string; final: string; unit: Unit };

export function CountSheetClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  function update(productId: string, field: keyof RowState, value: string) {
    setSavedCount(null);
    setRows((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? { inicial: '', ingresos: '', final: '', unit: 'u' }),
        [field]: value,
      } as RowState,
    }));
  }

  async function handleSave() {
    setError(null);
    setSavedCount(null);
    const payload = Object.entries(rows)
      .map(([productId, r]) => ({
        productId,
        inicial: r.inicial?.trim() ? Number(r.inicial) : null,
        ingresos: r.ingresos?.trim() ? Number(r.ingresos) : null,
        final: r.final?.trim() ? Number(r.final) : null,
        unit: r.unit ?? 'u',
      }))
      .filter((r) => r.inicial != null || r.ingresos != null || r.final != null);

    if (payload.length === 0) {
      setError('No cargaste ningún cambio.');
      return;
    }

    setSubmitting(true);
    const result = await submitAuditCount(payload);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRows({});
    setSavedCount(result.saved);
    router.refresh();
  }

  if (products.length === 0) {
    return <p className="mb-4 text-sm text-foreground">Todavía no hay productos cargados en este local.</p>;
  }

  return (
    <div className="mb-6">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium">Unidad</th>
              <th className="px-4 py-2 font-medium">Inicial</th>
              <th className="px-4 py-2 font-medium">Ingresos</th>
              <th className="px-4 py-2 font-medium">Final</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const row = rows[p.id] ?? { inicial: '', ingresos: '', final: '', unit: 'u' as Unit };
              return (
                <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-2">
                    <select
                      value={row.unit}
                      onChange={(e) => update(p.id, 'unit', e.target.value)}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={row.inicial}
                      onChange={(e) => update(p.id, 'inicial', e.target.value)}
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={row.ingresos}
                      onChange={(e) => update(p.id, 'ingresos', e.target.value)}
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={row.final}
                      onChange={(e) => update(p.id, 'final', e.target.value)}
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {savedCount != null && (
        <p className="mt-2 text-sm text-green-600">
          Conteo guardado ({savedCount} movimiento{savedCount === 1 ? '' : 's'}).
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={submitting}
        className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Guardando...' : 'Guardar conteo'}
      </button>
    </div>
  );
}
