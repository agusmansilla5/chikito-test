'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SupplierFulfillmentMode } from '@/lib/types';

export type SupplierInput = {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  fulfillment_mode: SupplierFulfillmentMode | null;
  cbu_cvu: string | null;
  alias: string | null;
  bank_name: string | null;
  account_holder: string | null;
};

export async function createSupplier(input: SupplierInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('suppliers').insert(input).select().single();
  if (error) return { error: error.message, supplier: null };
  revalidatePath('/suppliers');
  revalidatePath('/purchase-orders');
  return { error: null, supplier: data };
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const supabase = await createClient();
  const { error } = await supabase.from('suppliers').update(input).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/suppliers');
  revalidatePath('/purchase-orders');
  return { error: null };
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      return { error: 'Este proveedor ya tiene órdenes de compra registradas, no se puede eliminar.' };
    }
    return { error: error.message };
  }
  revalidatePath('/suppliers');
  return { error: null };
}

export async function addSupplierProduct(
  supplierId: string,
  productId: string,
  defaultQuantity: number | null,
  defaultUnitCost: number | null
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('supplier_products')
    .insert({
      supplier_id: supplierId,
      product_id: productId,
      default_quantity: defaultQuantity,
      default_unit_cost: defaultUnitCost,
    })
    .select('*, products(name)')
    .single();
  if (error) {
    if (error.code === '23505') return { error: 'Ese producto ya está en la lista de habituales.', supplierProduct: null };
    return { error: error.message, supplierProduct: null };
  }
  revalidatePath('/suppliers');
  return { error: null, supplierProduct: data };
}

export async function removeSupplierProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('supplier_products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/suppliers');
  return { error: null };
}
