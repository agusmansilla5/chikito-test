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

export async function createPurchaseOrder(
  supplierId: string,
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
    .insert({ supplier_id: supplierId, location_id: locationId, note, created_by: user.id })
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

export async function receivePurchaseOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('receive_purchase_order', { order_id: id });
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
    .eq('status', 'pendiente');
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
