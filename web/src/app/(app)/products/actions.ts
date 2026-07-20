'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getLocations, getSelectedLocationId } from '@/lib/location';

export type ProductInput = {
  name: string;
  barcode: string | null;
  min_stock: number;
  category_id: string | null;
  cost_price: number | null;
  sale_price: number | null;
};

function describeProductError(error: { code: string; message: string }): string {
  if (error.code !== '23505') return error.message;
  return error.message.includes('products_name_lower_idx')
    ? 'Ya existe un producto con ese nombre. Elegilo de la lista en vez de crear uno nuevo.'
    : 'Ya existe un producto con ese código de barras.';
}

export async function createProduct(input: ProductInput, initialQuantity: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { min_stock, ...productFields } = input;
  const { data: product, error } = await supabase.from('products').insert(productFields).select().single();
  if (error) return { error: describeProductError(error) };

  const locations = await getLocations();
  const locationId = await getSelectedLocationId(locations);

  if (locations.length > 0) {
    await supabase.from('product_stock').insert(
      locations.map((l) => ({
        product_id: product.id,
        location_id: l.id,
        quantity: 0,
        min_stock: l.id === locationId ? min_stock : 0,
      }))
    );
  }

  if (initialQuantity > 0 && user && locationId) {
    const { data: openAudit } = await supabase
      .from('audits')
      .select('id')
      .eq('location_id', locationId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from('stock_movements').insert({
      product_id: product.id,
      type: 'entrada',
      quantity: initialQuantity,
      created_by: user.id,
      location_id: locationId,
      audit_id: openAudit?.id ?? null,
      note: 'Cantidad inicial al crear el producto',
    });
  }

  revalidatePath('/products');
  revalidatePath('/dashboard');
  revalidatePath('/audits');
  return { error: null, product };
}

export async function updateProduct(id: string, input: ProductInput) {
  const supabase = await createClient();
  const { min_stock, ...productFields } = input;
  const { error } = await supabase.from('products').update(productFields).eq('id', id);
  if (error) return { error: describeProductError(error) };

  const locationId = await getSelectedLocationId();
  if (locationId) {
    await supabase
      .from('product_stock')
      .upsert({ product_id: id, location_id: locationId, min_stock }, { onConflict: 'product_id,location_id' });
  }

  revalidatePath('/products');
  return { error: null };
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ active: false }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/products');
  revalidatePath('/dashboard');
  revalidatePath('/movement');
  return { error: null };
}

export async function createCategory(name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').insert({ name }).select().single();
  if (error) return { error: error.code === '23505' ? 'Ya existe esa categoría.' : error.message, category: null };
  revalidatePath('/products');
  return { error: null, category: data };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/products');
  return { error: null };
}
