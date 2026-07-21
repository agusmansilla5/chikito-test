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

// El .select().maybeSingle() no es solo para leer el resultado: la policy de
// RLS de audits ahora restringe el UPDATE a "admin, o quien inició esa
// auditoría" (ver restrict_audit_close_to_owner.sql). Si la policy bloquea la
// fila, Postgres no tira error - simplemente no la toca - así que sin el
// select no habría forma de distinguir "se guardó" de "no tenías permiso".
export async function updateAuditNote(auditId: string, note: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('audits').update({ note }).eq('id', auditId).select().maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Solo quien inició esta auditoría, o un admin, puede editarla.' };
  revalidatePath('/audits');
  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

export async function closeAudit(auditId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audits')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', auditId)
    .select()
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Solo quien inició esta auditoría, o un admin, puede cerrarla.' };
  revalidatePath('/audits');
  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}
