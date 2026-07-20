import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import { formatDate } from '@/lib/date';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types';

type PurchaseOrderRow = PurchaseOrder & { suppliers?: { name: string } | null; locations?: { name: string } | null };

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pendiente: 'Pendiente',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

const STATUS_CLASS: Record<PurchaseOrderStatus, string> = {
  pendiente: 'bg-accent/15 text-accent',
  recibida: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  cancelada: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const profile = await requireProfile();
  const supabase = await createClient();
  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);
  const isAllLocations = locationValue === ALL_LOCATIONS_VALUE;

  const { data: orders, count } = isAllLocations
    ? await supabase
        .from('purchase_orders')
        .select('*, suppliers(name), locations(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
    : locationValue
      ? await supabase
          .from('purchase_orders')
          .select('*, suppliers(name)', { count: 'exact' })
          .eq('location_id', locationValue)
          .order('created_at', { ascending: false })
          .range(from, to)
      : { data: [], count: 0 };

  const orderList = (orders as PurchaseOrderRow[]) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canCreate = (profile.role === 'admin' || profile.role === 'auditor') && !isAllLocations;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Órdenes de compra</h1>
        {canCreate && (
          <Link
            href="/purchase-orders/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            + Nueva orden
          </Link>
        )}
      </div>

      {isAllLocations && (
        <p className="mb-4 text-sm text-foreground">
          Vista general: órdenes de todos los locales. Elegí un local en el menú para crear una.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              {isAllLocations && <th className="px-4 py-2 font-medium">Local</th>}
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 && (
              <tr>
                <td colSpan={isAllLocations ? 5 : 4} className="px-4 py-6 text-center text-foreground">
                  Todavía no se cargó ninguna orden de compra.
                </td>
              </tr>
            )}
            {orderList.map((o) => (
              <tr key={o.id} className="border-t border-zinc-100 hover:bg-background dark:border-zinc-800">
                {isAllLocations && <td className="px-4 py-2 text-foreground">{o.locations?.name ?? '—'}</td>}
                <td className="px-4 py-2 font-medium text-foreground">{o.suppliers?.name ?? '—'}</td>
                <td className="px-4 py-2 text-foreground">{formatDate(o.created_at)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/purchase-orders/${o.id}`} className="font-medium text-accent hover:underline">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-foreground">
          <Link
            href={`/purchase-orders?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700 ${
              page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-background'
            }`}
          >
            ‹ Anterior
          </Link>
          <span>
            Página {page} de {totalPages}
          </span>
          <Link
            href={`/purchase-orders?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={`rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700 ${
              page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-background'
            }`}
          >
            Siguiente ›
          </Link>
        </div>
      )}
    </div>
  );
}
