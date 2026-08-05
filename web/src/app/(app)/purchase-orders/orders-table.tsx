'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatPlainDate } from '@/lib/date';
import { derivePaymentStatus, daysElapsed } from '@/lib/purchase-order-payment';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types';
import { PaymentStatusBadge } from './payment-status-badge';
import { InlineEditField } from './inline-edit-field';

export type PurchaseOrderRow = PurchaseOrder & {
  suppliers?: { name: string } | null;
  locations?: { name: string } | null;
  purchase_order_payments?: { amount: number }[];
};

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pendiente: 'Pendiente de envío',
  pendiente_envio: 'Pendiente de envío',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

const STATUS_CLASS: Record<PurchaseOrderStatus, string> = {
  pendiente: 'bg-accent/15 text-accent',
  pendiente_envio: 'bg-accent/15 text-accent',
  recibida: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  cancelada: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

type ColumnKey = 'local' | 'proveedor' | 'fecha' | 'monto' | 'estado' | 'pago' | 'alias' | 'notas' | 'acciones';
type SortKey = 'proveedor' | 'fecha' | 'monto' | 'estado' | 'alias' | 'notas';

const LABELS: Record<ColumnKey, string> = {
  local: 'Local',
  proveedor: 'Proveedor',
  fecha: 'Fecha',
  monto: 'Monto',
  estado: 'Estado',
  pago: 'Pago',
  alias: 'Alias',
  notas: 'Notas',
  acciones: 'Acciones',
};

const SORTABLE: Partial<Record<ColumnKey, SortKey>> = {
  proveedor: 'proveedor',
  fecha: 'fecha',
  monto: 'monto',
  estado: 'estado',
  alias: 'alias',
  notas: 'notas',
};

const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = {
  proveedor: 'asc',
  fecha: 'desc',
  monto: 'desc',
  estado: 'asc',
  alias: 'asc',
  notas: 'asc',
};

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  local: 120,
  proveedor: 160,
  fecha: 100,
  monto: 110,
  estado: 140,
  pago: 110,
  alias: 130,
  notas: 160,
  acciones: 90,
};

const MIN_WIDTH = 60;
const STORAGE_KEY = 'nido-po-table-widths';

export function OrdersTable({ orders, isAllLocations }: { orders: PurchaseOrderRow[]; isAllLocations: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const columns: ColumnKey[] = isAllLocations
    ? ['local', 'proveedor', 'fecha', 'monto', 'estado', 'pago', 'alias', 'notas', 'acciones']
    : ['proveedor', 'fecha', 'monto', 'estado', 'pago', 'alias', 'notas', 'acciones'];

  const [widths, setWidths] = useState<Record<ColumnKey, number>>(DEFAULT_WIDTHS);

  // localStorage no existe en el server, así que el ancho guardado por el
  // usuario se aplica recién post-montaje (no se puede leer en el initializer
  // de useState sin romper la hidratación).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync intencional con localStorage post-montaje
        setWidths((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // ignorar localStorage corrupto
    }
  }, []);

  function persist(next: Record<ColumnKey, number>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage puede fallar en modo privado; no es crítico
    }
  }

  function startResize(e: React.MouseEvent, key: ColumnKey) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widths[key];

    function onMove(ev: MouseEvent) {
      const nextWidth = Math.max(MIN_WIDTH, Math.round(startWidth + (ev.clientX - startX)));
      setWidths((prev) => ({ ...prev, [key]: nextWidth }));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setWidths((prev) => {
        persist(prev);
        return prev;
      });
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const activeSortRaw = searchParams.get('sort');
  const activeSort: SortKey = activeSortRaw && activeSortRaw in DEFAULT_DIR ? (activeSortRaw as SortKey) : 'fecha';
  const activeDirRaw = searchParams.get('dir');
  const activeDir: 'asc' | 'desc' = activeDirRaw === 'asc' || activeDirRaw === 'desc' ? activeDirRaw : 'desc';

  function toggleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeSortRaw === key) {
      params.set('dir', activeDir === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sort', key);
      params.set('dir', DEFAULT_DIR[key]);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
      <table className="text-sm" style={{ tableLayout: 'fixed', width: columns.reduce((sum, c) => sum + widths[c], 0) }}>
        <colgroup>
          {columns.map((c) => (
            <col key={c} style={{ width: widths[c] }} />
          ))}
        </colgroup>
        <thead className="bg-background text-left text-foreground">
          <tr>
            {columns.map((col, idx) => {
              const sortKey = SORTABLE[col];
              return (
                <th key={col} className="relative select-none px-4 py-2 font-medium">
                  {sortKey ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(sortKey)}
                      className="flex items-center gap-1 hover:text-accent"
                    >
                      {LABELS[col]}
                      <span className="text-[10px] leading-none opacity-70">
                        {activeSort === sortKey ? (activeDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    LABELS[col]
                  )}
                  {idx < columns.length - 1 && (
                    <span
                      onMouseDown={(e) => startResize(e, col)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-accent/50"
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-foreground">
                No se encontraron pedidos con estos filtros.
              </td>
            </tr>
          )}
          {orders.map((o) => {
            const paymentStatus = derivePaymentStatus(o.amount, o.purchase_order_payments ?? []);
            const daysSinceOrder = daysElapsed(o.order_date);
            return (
              <tr key={o.id} className="border-t border-zinc-100 hover:bg-background dark:border-zinc-800">
                {isAllLocations && (
                  <td className="overflow-hidden px-4 py-2 text-foreground">{o.locations?.name ?? '—'}</td>
                )}
                <td className="overflow-hidden px-4 py-2 font-medium text-foreground">{o.suppliers?.name ?? '—'}</td>
                <td className="overflow-hidden px-4 py-2 text-foreground">{formatPlainDate(o.order_date)}</td>
                <td className="overflow-hidden px-4 py-2 text-foreground">
                  {o.amount != null ? o.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '—'}
                </td>
                <td className="overflow-hidden px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="overflow-hidden px-4 py-2">
                  {o.status === 'cancelada' ? '—' : <PaymentStatusBadge status={paymentStatus} daysSinceOrder={daysSinceOrder} />}
                </td>
                <td className="overflow-hidden px-4 py-2">
                  <InlineEditField orderId={o.id} field="alias" value={o.alias} placeholder="+ agregar" />
                </td>
                <td className="overflow-hidden px-4 py-2">
                  <InlineEditField orderId={o.id} field="note" value={o.note} placeholder="+ agregar" />
                </td>
                <td className="overflow-hidden px-4 py-2">
                  <Link href={`/purchase-orders/${o.id}`} className="font-medium text-accent hover:underline">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
