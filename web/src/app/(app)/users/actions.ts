'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false, error: 'No autorizado.' };
  return { ok: true };
}

export async function inviteUser(email: string, fullName: string, role: UserRole) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const origin = (await headers()).get('origin') ?? '';
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };

  revalidatePath('/users');
  return { error: null };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) return { error: error.message };

  revalidatePath('/users');
  return { error: null };
}

// Desactivar bloquea el login (ban largo en vez de borrar), para no perder
// referencias en stock_movements/audits ni tener que lidiar con los FK que
// las protegen contra borrado.
export async function setUserActive(userId: string, active: boolean) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876000h',
  });
  if (error) return { error: error.message };

  revalidatePath('/users');
  return { error: null };
}
