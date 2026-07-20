import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { formatDate, formatDateTime } from '@/lib/date';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/lib/types';
import { ReceiveButton, CancelButton, DeleteButton } from './actions-buttons';

type PurchaseOrderDetail = PurchaseOrder & {
  suppliers?: { name: string; phone: string | null; email: string | null } | null;
  locations?: { name: string } | null;
};

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

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name, phone, email), locations(name)')
    .eq('id', id)
    .single();

  if (!order) {
    return (
      <div>
        <p className="text-foreground">No se encontró la orden de compra.</p>
      </div>
    );
  }

  const orderData = order as PurchaseOrderDetail;

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('*, products(name)')
    .eq('purchase_order_id', id);

  const itemList = (items as PurchaseOrderItem[]) ?? [];
  const total = itemList.reduce((sum, i) => sum + i.quantity * (i.unit_cost ?? 0), 0);

  const canManage = profile.role === 'admin' || profile.role === 'auditor';
  const isAdmin = profile.role === 'admin';

  return (
    <div>
      <Link href="/purchase-orders" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Volver a órdenes de compra
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{orderData.suppliers?.name ?? 'Proveedor'}</h1>
          <p className="mt-1 text-sm text-foreground">
            {formatDateTime(orderData.created_at)}
            {orderData.locations?.name && ` · ${orderData.locations.name}`}
            {orderData.received_at && ` · Recibida el ${formatDate(orderData.received_at)}`}
          </p>
          {orderData.note && <p className="mt-1 text-sm italic text-foreground">{orderData.note}</p>}
          {(orderData.suppliers?.phone || orderData.suppliers?.email) && (
            <p className="mt-1 text-xs text-foreground">
              {orderData.suppliers?.phone}
              {orderData.suppliers?.phone && orderData.suppliers?.email && ' · '}
              {orderData.suppliers?.email}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[orderData.status]}`}>
            {STATUS_LABEL[orderData.status]}
          </span>
        </div>
      </div>

      {canManage && orderData.status === 'pendiente' && (
        <div className="mb-6 flex gap-2">
          <ReceiveButton id={orderData.id} />
          <CancelButton id={orderData.id} />
        </div>
      )}

      <div className="mb-4 overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
              <th className="px-4 py-2 font-medium">Costo unitario</th>
              <th className="px-4 py-2 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itemList.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-foreground">
                  Esta orden no tiene productos.
                </td>
              </tr>
            )}
            {itemList.map((i) => (
              <tr key={i.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-medium text-foreground">{i.products?.name ?? '—'}</td>
                <td className="px-4 py-2 text-foreground">{i.quantity}</td>
                <td className="px-4 py-2 text-foreground">
                  {i.unit_cost != null
                    ? i.unit_cost.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
                    : '—'}
                </td>
                <td className="px-4 py-2 text-foreground">
                  {i.unit_cost != null
                    ? (i.unit_cost * i.quantity).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {itemList.length > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td colSpan={3} className="px-4 py-2 text-right font-semibold text-foreground">
                  Total
                </td>
                <td className="px-4 py-2 font-semibold text-foreground">
                  {total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isAdmin && <DeleteButton id={orderData.id} />}
    </div>
  );
}
