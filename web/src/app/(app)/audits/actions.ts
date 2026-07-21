'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// El sector se elige explícitamente en el form (StartAuditForm), en vez de
// depender del local seleccionado en el switcher - así se puede iniciar una
// auditoría en cualquier sector sin tener que ir a cambiarlo primero.
export async function startAudit(note: string | null, locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };
  if (!locationId) return { error: 'Elegí un sector.' };

  const { error } = await supabase.from('audits').insert({ started_by: user.id, note, location_id: locationId });
  if (error) return { error: error.message };
  revalidatePath('/audits');
  revalidatePath('/dashboard');
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

// Solo admin - reforzado acá además de en la policy de RLS, para dar un
// mensaje claro en vez de que la fila simplemente no se borre en silencio.
export async function deleteAudit(auditId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Solo un admin puede eliminar auditorías del historial.' };

  const { error } = await supabase.from('audits').delete().eq('id', auditId);
  if (error) return { error: error.message };

  revalidatePath('/audits');
  revalidatePath('/dashboard');
  return { error: null };
}
