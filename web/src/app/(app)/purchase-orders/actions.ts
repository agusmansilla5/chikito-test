'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSelectedLocationId } from '@/lib/location';

export type PurchaseOrderItemInput = {
  product_id: string;
  quantity: number;
  unit_cost: number | null;
};

export type ReceivedItemInput = {
  item_id: string;
  received_quantity: number;
};

export async function createPurchaseOrder(
  supplierId: string,
  orderDate: string,
  amount: number | null,
  shippingDetail: string | null,
  note: string | null,
  items: PurchaseOrderItemInput[]
) {
  if (items.length === 0) return { error: 'Agregá al menos un producto.', id: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.', id: null };

  const locationId = await getSelectedLocationId();
  if (!locationId) return { error: 'No hay ningún local seleccionado.', id: null };

  const { data: order, error } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id: supplierId,
      location_id: locationId,
      order_date: orderDate,
      amount,
      shipping_detail: shippingDetail,
      note,
      created_by: user.id,
      status: 'pendiente_envio',
    })
    .select()
    .single();
  if (error) return { error: error.message, id: null };

  const { error: itemsError } = await supabase.from('purchase_order_items').insert(
    items.map((item) => ({
      purchase_order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    }))
  );
  if (itemsError) return { error: itemsError.message, id: order.id };

  revalidatePath('/purchase-orders');
  return { error: null, id: order.id as string };
}

export async function receivePurchaseOrder(id: string, receivedItems?: ReceivedItemInput[]) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('receive_purchase_order', {
    order_id: id,
    received_items: receivedItems && receivedItems.length > 0 ? receivedItems : null,
  });
  if (error) return { error: error.message };

  revalidatePath('/purchase-orders');
  revalidatePath('/dashboard');
  revalidatePath('/products');
  return { error: null };
}

export async function cancelPurchaseOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'cancelada' })
    .eq('id', id)
    .in('status', ['pendiente', 'pendiente_envio']);
  if (error) return { error: error.message };

  revalidatePath('/purchase-orders');
  return { error: null };
}

export async function deletePurchaseOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/purchase-orders');
  redirect('/purchase-orders');
}

export async function createPurchaseOrderPayment(
  orderId: string,
  amount: number,
  paidAt: string,
  method: string | null,
  receiptPath: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.', payment: null };

  const { data, error } = await supabase
    .from('purchase_order_payments')
    .insert({
      purchase_order_id: orderId,
      amount,
      paid_at: paidAt,
      method,
      receipt_path: receiptPath,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) return { error: error.message, payment: null };

  revalidatePath(`/purchase-orders/${orderId}`);
  revalidatePath('/purchase-orders');
  return { error: null, payment: data };
}

export async function getPaymentReceiptUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('comprobantes-pedidos').createSignedUrl(path, 60 * 10);
  if (error) return { error: error.message, url: null };
  return { error: null, url: data.signedUrl };
}
