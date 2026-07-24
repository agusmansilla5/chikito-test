import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { formatDate, formatDateTime } from '@/lib/date';
import { derivePaymentStatus, daysElapsed, totalPaid } from '@/lib/purchase-order-payment';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderPayment, PurchaseOrderStatus } from '@/lib/types';
import { ReceiveButton, PayButton, CancelButton, DeleteButton } from './actions-buttons';
import { OrderExport } from './order-export';
import { PaymentStatusBadge } from '../payment-status-badge';
import { ReceiptLink } from './receipt-link';

type PurchaseOrderDetail = PurchaseOrder & {
  locations?: { name: string } | null;
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

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name, phone, email, cbu_cvu, alias, bank_name, account_holder), locations(name)')
    .eq('id', id)
    .single();

  if (!order) {
    return (
      <div>
        <p className="text-foreground">No se encontró el pedido.</p>
      </div>
    );
  }

  const orderData = order as PurchaseOrderDetail;

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from('purchase_order_items').select('*, products(name)').eq('purchase_order_id', id),
    supabase.from('purchase_order_payments').select('*').eq('purchase_order_id', id).order('paid_at', { ascending: false }),
  ]);

  const itemList = (items as PurchaseOrderItem[]) ?? [];
  const paymentList = (payments as PurchaseOrderPayment[]) ?? [];
  const total = itemList.reduce((sum, i) => sum + i.quantity * (i.unit_cost ?? 0), 0);
  const effectiveAmount = orderData.amount ?? (total > 0 ? total : null);
  const paid = totalPaid(paymentList);
  const remaining = effectiveAmount != null ? Math.max(0, effectiveAmount - paid) : null;
  const paymentStatus = derivePaymentStatus(effectiveAmount, paymentList);
  const daysSinceOrder = daysElapsed(orderData.order_date);

  const canManage = profile.role === 'admin' || profile.role === 'auditor';
  const isAdmin = profile.role === 'admin';
  const isPending = orderData.status === 'pendiente' || orderData.status === 'pendiente_envio';

  return (
    <div>
      <Link href="/purchase-orders" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Volver a pedidos
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{orderData.suppliers?.name ?? 'Proveedor'}</h1>
          <p className="mt-1 text-sm text-foreground">
            {formatDate(`${orderData.order_date}T00:00:00`)}
            {orderData.locations?.name && ` · ${orderData.locations.name}`}
            {orderData.received_at && ` · Recibido el ${formatDate(orderData.received_at)}`}
          </p>
          <p className="mt-1 text-xs text-foreground">Creado {formatDateTime(orderData.created_at)}</p>
          {orderData.note && <p className="mt-1 text-sm italic text-foreground">{orderData.note}</p>}
          {orderData.shipping_detail && (
            <p className="mt-1 text-sm text-foreground">Envío: {orderData.shipping_detail}</p>
          )}
          {(orderData.suppliers?.phone || orderData.suppliers?.email) && (
            <p className="mt-1 text-xs text-foreground">
              {orderData.suppliers?.phone}
              {orderData.suppliers?.phone && orderData.suppliers?.email && ' · '}
              {orderData.suppliers?.email}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[orderData.status]}`}>
            {STATUS_LABEL[orderData.status]}
          </span>
          {orderData.status === 'recibida' && (
            <PaymentStatusBadge status={paymentStatus} daysSinceOrder={daysSinceOrder} />
          )}
        </div>
      </div>

      {canManage && isPending && (
        <div className="mb-6 flex flex-wrap gap-2">
          <ReceiveButton
            orderId={orderData.id}
            items={itemList.map((i) => ({ id: i.id, name: i.products?.name ?? '—', quantity: i.quantity }))}
          />
          <CancelButton id={orderData.id} />
        </div>
      )}

      <div className="mb-4 overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
              {orderData.status === 'recibida' && <th className="px-4 py-2 font-medium">Recibido</th>}
              <th className="px-4 py-2 font-medium">Costo unitario</th>
              <th className="px-4 py-2 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itemList.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground">
                  Este pedido no tiene productos.
                </td>
              </tr>
            )}
            {itemList.map((i) => (
              <tr key={i.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-medium text-foreground">{i.products?.name ?? '—'}</td>
                <td className="px-4 py-2 text-foreground">{i.quantity}</td>
                {orderData.status === 'recibida' && (
                  <td
                    className={`px-4 py-2 font-medium ${
                      i.received_quantity != null && i.received_quantity < i.quantity ? 'text-red-600' : 'text-foreground'
                    }`}
                  >
                    {i.received_quantity ?? i.quantity}
                  </td>
                )}
                <td className="px-4 py-2 text-foreground">
                  {i.unit_cost != null ? i.unit_cost.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '—'}
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
                <td colSpan={orderData.status === 'recibida' ? 4 : 3} className="px-4 py-2 text-right font-semibold text-foreground">
                  {orderData.amount != null ? 'Monto del pedido' : 'Total (según costos cargados)'}
                </td>
                <td className="px-4 py-2 font-semibold text-foreground">
                  {(effectiveAmount ?? total).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Pagos</h2>
          {canManage && paymentStatus !== 'pagado' && (
            <PayButton orderId={orderData.id} supplier={orderData.suppliers ?? null} remaining={remaining} />
          )}
        </div>

        {effectiveAmount != null && (
          <p className="mb-3 text-sm text-foreground">
            Pagado {paid.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} de{' '}
            {effectiveAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
            {remaining != null && remaining > 0 && (
              <> · Saldo {remaining.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</>
            )}
          </p>
        )}

        {paymentList.length === 0 && <p className="text-sm text-foreground">Todavía no hay pagos registrados.</p>}
        {paymentList.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {paymentList.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">
                  {formatDate(`${p.paid_at}T00:00:00`)} · {p.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                  {p.method && ` · ${p.method}`}
                </span>
                {p.receipt_path && <ReceiptLink path={p.receipt_path} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPending && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
          <h2 className="mb-3 font-semibold text-foreground">Enviar pedido</h2>
          <OrderExport
            orderDate={orderData.order_date}
            supplierName={orderData.suppliers?.name ?? 'Proveedor'}
            locationName={orderData.locations?.name ?? ''}
            amount={orderData.amount}
            shippingDetail={orderData.shipping_detail}
            items={itemList.map((i) => ({ name: i.products?.name ?? '—', quantity: i.quantity, unit_cost: i.unit_cost }))}
          />
        </div>
      )}

      {isAdmin && <DeleteButton id={orderData.id} />}
    </div>
  );
}
