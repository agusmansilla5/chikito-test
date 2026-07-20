'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSelectedLocationId } from '@/lib/location';

export async function startAudit(note: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const locationId = await getSelectedLocationId();
  if (!locationId) return { error: 'No hay ningún local configurado.' };

  const { error } = await supabase.from('audits').insert({ started_by: user.id, note, location_id: locationId });
  if (error) return { error: error.message };
  revalidatePath('/audits');
  return { error: null };
}

export async function updateAuditNote(auditId: string, note: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from('audits').update({ note }).eq('id', auditId);
  if (error) return { error: error.message };
  revalidatePath('/audits');
  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

export async function closeAudit(auditId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('audits')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', auditId);
  if (error) return { error: error.message };
  revalidatePath('/audits');
  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}
