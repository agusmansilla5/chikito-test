'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LOCATION_COOKIE } from '@/lib/location';

export async function setLocation(locationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(LOCATION_COOKIE, locationId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
}

export async function createLocation(name: string, address: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('locations').insert({ name, address }).select().single();
  if (error) return { error: error.message, location: null };

  // Nuevo local: le crea la fila de stock (en 0) a cada producto activo para que
  // aparezca en las listas de ese local desde el primer momento.
  const { data: products } = await supabase.from('products').select('id');
  if (products && products.length > 0) {
    await supabase
      .from('product_stock')
      .insert(products.map((p) => ({ product_id: p.id, location_id: data.id, quantity: 0, min_stock: 0 })));
  }

  revalidatePath('/', 'layout');
  return { error: null, location: data };
}

export async function updateLocation(id: string, name: string, address: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from('locations').update({ name, address }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { error: null };
}

// Version liviana de updateLocation para renombrar rápido desde el selector de local,
// sin tocar la dirección (que ahí no se edita).
export async function renameLocation(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('locations').update({ name }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { error: null };
}

export async function deleteLocation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      return { error: 'Este local ya tiene movimientos o auditorías registradas, no se puede eliminar.' };
    }
    return { error: error.message };
  }
  revalidatePath('/', 'layout');
  return { error: null };
}
