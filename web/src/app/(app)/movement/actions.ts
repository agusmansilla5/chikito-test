'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { MovementType } from '@/lib/types';

export async function registerMovement(productId: string, type: MovementType, quantity: number, note: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const { data: openAudit } = await supabase
    .from('audits')
    .select('id')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('stock_movements').insert({
    product_id: productId,
    type,
    quantity,
    note,
    created_by: user.id,
    audit_id: openAudit?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath('/movement');
  revalidatePath('/dashboard');
  revalidatePath('/products');
  revalidatePath('/audits');
  return { error: null };
}
