'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Unit } from '@/lib/types';
import { UNIT_OPTIONS } from '@/lib/types';
import { submitAuditCount } from './actions';
import { closeAudit } from '../audits/actions';

type RowState = { inicial: string; ingresos: string; final: string; unit: Unit };

export function CountSheetClient({
  products,
  auditId,
  canClose,
  closeRedirectTo,
}: {
  products: Product[];
  // Si se pasan auditId + canClose, aparece un botón "Cerrar auditoría" que
  // primero guarda cualquier fila tipeada y sin guardar, y recién después
  // cierra - así cerrar nunca pisa un conteo que quedó a medio cargar (antes
  // "Guardar conteo" y "Cerrar auditoría" eran acciones separadas y cerrar
  // sin guardar antes dejaba la auditoría cerrada sin ningún movimiento).
  auditId?: string;
  canClose?: boolean;
  closeRedirectTo?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
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

  function buildPayload() {
    return Object.entries(rows)
      .map(([productId, r]) => ({
        productId,
        inicial: r.inicial?.trim() ? Number(r.inicial) : null,
        ingresos: r.ingresos?.trim() ? Number(r.ingresos) : null,
        final: r.final?.trim() ? Number(r.final) : null,
        unit: r.unit ?? ('u' as Unit),
      }))
      .filter((r) => r.inicial != null || r.ingresos != null || r.final != null);
  }

  async function handleSave() {
    setError(null);
    setSavedCount(null);
    const payload = buildPayload();

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

  async function handleClose() {
    if (!auditId) return;
    if (!confirm('¿Confirmás que se terminó de cargar el conteo de esta auditoría?')) return;

    setError(null);
    setSavedCount(null);
    setClosing(true);

    const payload = buildPayload();
    if (payload.length > 0) {
      const saveResult = await submitAuditCount(payload);
      if (saveResult.error) {
        setClosing(false);
        setError(saveResult.error);
        return;
      }
      setRows({});
    }

    const closeResult = await closeAudit(auditId);
    setClosing(false);
    if (closeResult.error) {
      setError(closeResult.error);
      return;
    }

    if (closeRedirectTo) {
      router.push(closeRedirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mb-6">
      {products.length === 0 ? (
        <p className="mb-4 text-sm text-foreground">Todavía no hay productos cargados en este local.</p>
      ) : (
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
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {savedCount != null && (
        <p className="mt-2 text-sm text-green-600">
          Conteo guardado ({savedCount} movimiento{savedCount === 1 ? '' : 's'}).
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {products.length > 0 && (
          <button
            onClick={handleSave}
            disabled={submitting || closing}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar conteo'}
          </button>
        )}
        {auditId && canClose && (
          <button
            onClick={handleClose}
            disabled={submitting || closing}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            {closing ? 'Cerrando...' : 'Cerrar auditoría'}
          </button>
        )}
      </div>
    </div>
  );
}
