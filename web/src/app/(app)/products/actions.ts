'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ProductInput = {
  name: string;
  barcode: string | null;
  min_stock: number;
  category_id: string | null;
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

  const { data: product, error } = await supabase.from('products').insert(input).select().single();
  if (error) return { error: describeProductError(error) };

  if (initialQuantity > 0 && user) {
    const { data: openAudit } = await supabase
      .from('audits')
      .select('id')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from('stock_movements').insert({
      product_id: product.id,
      type: 'entrada',
      quantity: initialQuantity,
      created_by: user.id,
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
  const { error } = await supabase.from('products').update(input).eq('id', id);
  if (error) return { error: describeProductError(error) };
  revalidatePath('/products');
  return { error: null };
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/products');
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
