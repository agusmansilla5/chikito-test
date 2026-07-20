'use server';

import { createClient } from '@/lib/supabase/server';

export async function updatePassword(password: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Tu sesión de recuperación expiró. Pedí un nuevo link.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}
