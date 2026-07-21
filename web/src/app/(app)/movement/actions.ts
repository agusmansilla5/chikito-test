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

export type CountRow = { productId: string; ingresos: number | null; final: number | null };

// Planilla de conteo: por cada fila con Ingresos y/o Final cargado, arma los
// movimientos correspondientes. Ingresos queda como su propia entrada (para
// trazabilidad); Final se compara contra "inicial + ingresos" y la
// diferencia (si la hay) queda como ajuste de auditoría.
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
    let expected = currentByProduct.get(row.productId) ?? 0;
    if (row.ingresos && row.ingresos > 0) {
      movements.push({
        product_id: row.productId,
        type: 'entrada',
        quantity: row.ingresos,
        note: 'Ingreso durante el conteo',
        created_by: user.id,
        location_id: locationId,
        audit_id: openAudit.id,
      });
      expected += row.ingresos;
    }
    if (row.final != null) {
      const diff = row.final - expected;
      if (diff !== 0) {
        movements.push({
          product_id: row.productId,
          type: diff > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(diff),
          note: 'Ajuste de auditoría (conteo)',
          created_by: user.id,
          location_id: locationId,
          audit_id: openAudit.id,
        });
      }
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
