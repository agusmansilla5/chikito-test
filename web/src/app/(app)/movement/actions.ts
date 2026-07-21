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

export type CountRow = { productId: string; inicial: number | null; ingresos: number | null; final: number | null };

// Planilla de conteo: Inicial/Ingresos/Final son todos editables y libres,
// no dependen de lo que el sistema ya tenía cargado (que puede estar
// desactualizado). Por cada fila con algún campo cargado, se calcula el
// stock "objetivo" (lo que debería quedar según lo escrito) y se compara
// contra el stock real actual: la diferencia, si la hay, es un único
// movimiento de ajuste.
export async function submitAuditCount(rows: CountRow[]) {
  if (rows.length === 0) return { error: 'No hay filas para guardar.', saved: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.', saved: 0 };

  const locationId = await getSelectedLocationId();
  if (!locationId) return { error: 'No hay ningún local configurado.', saved: 0 };

  const { data: openAudit } = await supabase
    .from('audits')
    .select('id')
    .eq('location_id', locationId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!openAudit) return { error: 'Primero iniciá una auditoría en este local para poder cargar productos.', saved: 0 };

  const { data: stockRows } = await supabase
    .from('product_stock')
    .select('product_id, quantity')
    .eq('location_id', locationId)
    .in(
      'product_id',
      rows.map((r) => r.productId)
    );
  const currentByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, r.quantity]));

  const movements: {
    product_id: string;
    type: 'entrada' | 'salida';
    quantity: number;
    note: string;
    created_by: string;
    location_id: string;
    audit_id: string;
  }[] = [];

  for (const row of rows) {
    if (row.inicial == null && row.ingresos == null && row.final == null) continue;

    const current = currentByProduct.get(row.productId) ?? 0;
    const base = row.inicial ?? current;
    const afterIngresos = base + (row.ingresos ?? 0);
    const target = row.final ?? afterIngresos;

    const diff = target - current;
    if (diff !== 0) {
      movements.push({
        product_id: row.productId,
        type: diff > 0 ? 'entrada' : 'salida',
        quantity: Math.abs(diff),
        note: 'Conteo de auditoría',
        created_by: user.id,
        location_id: locationId,
        audit_id: openAudit.id,
      });
    }
  }

  if (movements.length === 0) return { error: 'No cargaste ningún cambio.', saved: 0 };

  const { error } = await supabase.from('stock_movements').insert(movements);
  if (error) return { error: error.message, saved: 0 };

  revalidatePath('/movement');
  revalidatePath('/dashboard');
  revalidatePath('/products');
  revalidatePath('/audits');
  return { error: null, saved: movements.length };
}
