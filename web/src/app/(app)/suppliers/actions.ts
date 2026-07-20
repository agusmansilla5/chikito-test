'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createSupplier(name: string, phone: string | null, email: string | null, notes: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name, phone, email, notes })
    .select()
    .single();
  if (error) return { error: error.message, supplier: null };
  revalidatePath('/suppliers');
  revalidatePath('/purchase-orders');
  return { error: null, supplier: data };
}

export async function updateSupplier(
  id: string,
  name: string,
  phone: string | null,
  email: string | null,
  notes: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.from('suppliers').update({ name, phone, email, notes }).eq('id', id);
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
