import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import { derivePaymentStatus, daysElapsed, totalPaid } from '@/lib/purchase-order-payment';
import type { Supplier } from '@/lib/types';
import { StatCard } from '../stat-card';
import { ModuleTabs } from './module-tabs';
import { HistoryFilters } from './history-filters';
import { HistoryExport, type HistoryExportRow } from './history-export';
import { OrdersTable, type PurchaseOrderRow } from './orders-table';

const PAGE_SIZE = 20;

type SortKey = 'proveedor' | 'fecha' | 'monto' | 'estado' | 'alias' | 'notas';

const SORT_COLUMNS: Record<SortKey, { column: string; foreignTable?: string }> = {
  proveedor: { column: 'name', foreignTable: 'suppliers' },
  fecha: { column: 'order_date' },
  monto: { column: 'amount' },
  estado: { column: 'status' },
  alias: { column: 'alias' },
  notas: { column: 'note' },
};

function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    supplier?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const {
    page: pageParam,
    status: statusFilter,
    supplier: supplierFilter,
    from: dateFrom,
    to: dateTo,
    sort: sortParam,
    dir: dirParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const sortKey: SortKey = sortParam && sortParam in SORT_COLUMNS ? (sortParam as SortKey) : 'fecha';
  const sortAscending = dirParam === 'asc';
  const sortConfig = SORT_COLUMNS[sortKey];

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
        .order(sortConfig.column, { ascending: sortAscending, foreignTable: sortConfig.foreignTable })
        .range(from, to)
    : { data: [], count: 0 };

  const { data: exportOrders } = canQuery
    ? await applyFilters(supabase.from('purchase_orders').select(baseSelect)).order(sortConfig.column, {
        ascending: sortAscending,
        foreignTable: sortConfig.foreignTable,
      })
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
    if (sortParam) params.set('sort', sortParam);
    if (dirParam) params.set('dir', dirParam);
    params.set('page', String(targetPage));
    return `/purchase-orders?${params.toString()}`;
  }

  // Resumen de $ del listado filtrado (excluye canceladas: no representan
  // una obligación de pago real, ni pendiente ni cumplida).
  const payableOrders = ((exportOrders as PurchaseOrderRow[]) ?? []).filter((o) => o.status !== 'cancelada');
  const filteredTotalAmount = payableOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0);
  const filteredTotalPaid = payableOrders.reduce((sum, o) => sum + totalPaid(o.purchase_order_payments ?? []), 0);
  const filteredTotalPending = Math.max(0, filteredTotalAmount - filteredTotalPaid);

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

      <OrdersTable orders={orderList} isAllLocations={isAllLocations} />

      <div className="mb-4 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Monto total (filtrado)"
          value={filteredTotalAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
        />
        <StatCard
          label="Abonado a proveedores"
          value={filteredTotalPaid.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
        />
        <StatCard
          label="Pendiente de pago a proveedores"
          value={filteredTotalPending.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
        />
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
