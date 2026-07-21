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

  // A propósito, NO se siembra stock en cero para todo el catálogo acá: un
  // local nuevo arranca vacío y solo va a tener los productos que se cuenten
  // o registren específicamente ahí (por movimiento, alta de producto o
  // importación de conteo), no el catálogo entero de los demás locales.
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
