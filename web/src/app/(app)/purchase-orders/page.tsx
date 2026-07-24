import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import { formatDate } from '@/lib/date';
import { derivePaymentStatus, daysElapsed, totalPaid } from '@/lib/purchase-order-payment';
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/lib/types';
import { StatCard } from '../stat-card';
import { ModuleTabs } from './module-tabs';
import { HistoryFilters } from './history-filters';
import { HistoryExport, type HistoryExportRow } from './history-export';
import { PaymentStatusBadge } from './payment-status-badge';

type PurchaseOrderRow = PurchaseOrder & {
  suppliers?: { name: string } | null;
  locations?: { name: string } | null;
  purchase_order_payments?: { amount: number }[];
};

const PAGE_SIZE = 20;

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

function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; supplier?: string; from?: string; to?: string }>;
}) {
  const { page: pageParam, status: statusFilter, supplier: supplierFilter, from: dateFrom, to: dateTo } =
    await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const profile = await requireProfile();
  const supabase = await createClient();
  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);
  const isAllLocations = locationValue === ALL_LOCATIONS_VALUE;

  const { data: suppliersData } = await supabase.from('suppliers').select('*').order('name');
  const suppliers = (suppliersData as Supplier[]) ?? [];

  function applyFilters<T>(query: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = query as any;
    if (!isAllLocations && locationValue) q = q.eq('location_id', locationValue);
    if (statusFilter && statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (supplierFilter && supplierFilter !== 'all') q = q.eq('supplier_id', supplierFilter);
    if (dateFrom) q = q.gte('order_date', dateFrom);
    if (dateTo) q = q.lte('order_date', dateTo);
    return q;
  }

  const baseSelect = '*, suppliers(name), locations(name), purchase_order_payments(amount)';

  const canQuery = isAllLocations || !!locationValue;

  const { data: orders, count } = canQuery
    ? await applyFilters(
        supabase.from('purchase_orders').select(baseSelect, { count: 'exact' })
      )
        .order('order_date', { ascending: false })
        .range(from, to)
    : { data: [], count: 0 };

  const { data: exportOrders } = canQuery
    ? await applyFilters(supabase.from('purchase_orders').select(baseSelect)).order('order_date', { ascending: false })
    : { data: [] };

  let weeklyQuery = supabase.from('purchase_orders').select('amount').gte('order_date', sevenDaysAgoIso());
  if (!isAllLocations && locationValue) weeklyQuery = weeklyQuery.eq('location_id', locationValue);
  const { data: weeklyOrders } = canQuery ? await weeklyQuery : { data: [] };
  const weeklySpend = ((weeklyOrders as { amount: number | null }[]) ?? []).reduce((sum, o) => sum + (o.amount ?? 0), 0);

  const orderList = (orders as PurchaseOrderRow[]) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canCreate = (profile.role === 'admin' || profile.role === 'auditor') && !isAllLocations;

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (supplierFilter && supplierFilter !== 'all') params.set('supplier', supplierFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    params.set('page', String(targetPage));
    return `/purchase-orders?${params.toString()}`;
  }

  const exportRows: HistoryExportRow[] = ((exportOrders as PurchaseOrderRow[]) ?? []).map((o) => {
    const paid = totalPaid(o.purchase_order_payments ?? []);
    const status = derivePaymentStatus(o.amount, o.purchase_order_payments ?? []);
    return {
      supplierName: o.suppliers?.name ?? '—',
      orderDate: o.order_date,
      amount: o.amount,
      paid,
      status: o.status,
      paymentStatusLabel: status === 'pagado' ? 'Pagado' : status === 'parcial' ? 'Parcial' : 'Pendiente',
      daysSinceOrder: daysElapsed(o.order_date),
    };
  });

  return (
    <div>
      <ModuleTabs />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Pedidos</h1>
        {canCreate && (
          <Link
            href="/purchase-orders/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            + Nuevo pedido
          </Link>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Gasto de los últimos 7 días" value={weeklySpend.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} />
        <StatCard label="Pedidos en este listado" value={count ?? 0} />
      </div>

      {isAllLocations && (
        <p className="mb-4 text-sm text-foreground">
          Vista general: pedidos de todos los locales. Elegí un local en el menú para crear uno.
        </p>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <HistoryFilters suppliers={suppliers} />
        <HistoryExport orders={exportRows} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              {isAllLocations && <th className="px-4 py-2 font-medium">Local</th>}
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Monto</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Pago</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 && (
              <tr>
                <td colSpan={isAllLocations ? 7 : 6} className="px-4 py-6 text-center text-foreground">
                  No se encontraron pedidos con estos filtros.
                </td>
              </tr>
            )}
            {orderList.map((o) => {
              const paymentStatus = derivePaymentStatus(o.amount, o.purchase_order_payments ?? []);
              const daysSinceOrder = daysElapsed(o.order_date);
              return (
                <tr key={o.id} className="border-t border-zinc-100 hover:bg-background dark:border-zinc-800">
                  {isAllLocations && <td className="px-4 py-2 text-foreground">{o.locations?.name ?? '—'}</td>}
                  <td className="px-4 py-2 font-medium text-foreground">{o.suppliers?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{formatDate(`${o.order_date}T00:00:00`)}</td>
                  <td className="px-4 py-2 text-foreground">
                    {o.amount != null ? o.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {o.status === 'cancelada' ? '—' : <PaymentStatusBadge status={paymentStatus} daysSinceOrder={daysSinceOrder} />}
                  </td>
                  <td className="px-4 py-2">
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-foreground">
          <Link
            href={pageHref(page - 1)}
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
            href={pageHref(page + 1)}
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
