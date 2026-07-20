import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Location } from '@/lib/types';

export const LOCATION_COOKIE = 'nido_location_id';

export async function getLocations(): Promise<Location[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
  return (data as Location[]) ?? [];
}

// Resuelve el local seleccionado a partir de la cookie, validando que siga existiendo
// (por si se borró el local que tenía guardado); si no hay cookie o es inválida, cae
// al primer local. Devuelve null solo si todavía no hay ningún local cargado.
export async function getSelectedLocationId(locations?: Location[]): Promise<string | null> {
  const list = locations ?? (await getLocations());
  if (list.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCATION_COOKIE)?.value;
  if (cookieValue && list.some((l) => l.id === cookieValue)) return cookieValue;
  return list[0].id;
}
