'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSelectedLocationId } from '@/lib/location';
import type { MovementType } from '@/lib/types';

export async function registerMovement(productId: string, type: MovementType, quantity: number, note: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const locationId = await getSelectedLocationId();
  if (!locationId) return { error: 'No hay ningún local configurado.' };

  const { data: openAudit } = await supabase
    .from('audits')
    .select('id')
    .eq('location_id', locationId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Todo movimiento tiene que quedar dentro de una auditoría - no se cargan
  // productos sueltos fuera de un conteo en curso.
  if (!openAudit) return { error: 'Primero iniciá una auditoría en este local para poder cargar productos.' };

  const { error } = await supabase.from('stock_movements').insert({
    product_id: productId,
    type,
    quantity,
    note,
    created_by: user.id,
    location_id: locationId,
    audit_id: openAudit.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/movement');
  revalidatePath('/dashboard');
  revalidatePath('/products');
  revalidatePath('/audits');
  return { error: null };
}
