import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Location } from '@/lib/types';
import { LOCATION_COOKIE, ALL_LOCATIONS_VALUE } from '@/lib/location-constants';

export { LOCATION_COOKIE, ALL_LOCATIONS_VALUE };

export async function getLocations(): Promise<Location[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
  return (data as Location[]) ?? [];
}

// Para lectura: puede devolver el id de un local real, "all" (vista general agregada),
// o null si todavía no hay ningún local cargado.
export async function getSelectedLocationValue(locations?: Location[]): Promise<string | null> {
  const list = locations ?? (await getLocations());
  if (list.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCATION_COOKIE)?.value;
  if (cookieValue === ALL_LOCATIONS_VALUE) return ALL_LOCATIONS_VALUE;
  if (cookieValue && list.some((l) => l.id === cookieValue)) return cookieValue;
  return list[0].id;
}

// Para escritura (registrar movimientos, editar stock, iniciar auditorías, etc.):
// siempre un local real, nunca "all" - parado en la vista general no hay dónde escribir.
export async function getSelectedLocationId(locations?: Location[]): Promise<string | null> {
  const value = await getSelectedLocationValue(locations);
  return value === ALL_LOCATIONS_VALUE ? null : value;
}
