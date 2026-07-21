'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSelectedLocationId } from '@/lib/location';

export type ImportRow = {
  productId: string | null; // null = crear producto nuevo
  name: string;
  categoryId: string | null;
  areaId: string | null;
  minStock: number | null;
  countedQuantity: number;
};

export async function importStockCount(rows: ImportRow[]) {
  if (rows.length === 0) return { error: 'No hay filas para importar.', created: 0, updated: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.', created: 0, updated: 0 };

  const locationId = await getSelectedLocationId();
  if (!locationId) return { error: 'No hay ningún local seleccionado.', created: 0, updated: 0 };

  const { data: openAudit } = await supabase
    .from('audits')
    .select('id')
    .eq('location_id', locationId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let created = 0;
  const newProductIds = new Set<string>();
  const resolved: { id: string; counted: number }[] = [];

  for (const row of rows) {
    let productId: string;

    if (row.productId) {
      productId = row.productId;
    } else {
      const { data: product, error } = await supabase
        .from('products')
        .insert({ name: row.name, category_id: row.categoryId, area_id: row.areaId })
        .select()
        .single();
      if (error) {
        return {
          error: `No se pudo crear "${row.name}": ${
            error.code === '23505' ? 'ya existe un producto con ese nombre.' : error.message
          }`,
          created,
          updated: 0,
        };
      }
      productId = product.id as string;
      created += 1;
      newProductIds.add(productId);

      // Solo se carga en el local donde se está importando, no en todos los
      // locales - mismo criterio que createProduct.
      await supabase
        .from('product_stock')
        .insert({ product_id: productId, location_id: locationId, min_stock: row.minStock ?? 0, quantity: 0 });
    }

    resolved.push({ id: productId, counted: row.countedQuantity });
  }

  const { data: stockRows } = await supabase
    .from('product_stock')
    .select('product_id, quantity')
    .eq('location_id', locationId)
    .in(
      'product_id',
      resolved.map((r) => r.id)
    );
  const currentByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, r.quantity]));

  const movements = resolved
    .map((r) => {
      const current = currentByProduct.get(r.id) ?? 0;
      const diff = r.counted - current;
      if (diff === 0) return null;
      return {
        product_id: r.id,
        type: (diff > 0 ? 'entrada' : 'salida') as 'entrada' | 'salida',
        quantity: Math.abs(diff),
        note: 'Ajuste por conteo importado',
        created_by: user.id,
        location_id: locationId,
        audit_id: openAudit?.id ?? null,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (movements.length > 0) {
    const { error: movError } = await supabase.from('stock_movements').insert(movements);
    if (movError) return { error: movError.message, created, updated: 0 };
  }

  const updated = movements.filter((m) => !newProductIds.has(m.product_id)).length;

  revalidatePath('/products');
  revalidatePath('/dashboard');
  revalidatePath('/audits');
  return { error: null, created, updated };
}
