'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const origin = (await headers()).get('origin') ?? '';

  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
  }

  redirect('/forgot-password?sent=1');
}
