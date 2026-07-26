import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Cliente con la service role key del proyecto Supabase de PRUEBA (no el de
// producción - ver web/tests/README.md). Salta RLS: se usa para armar/limpiar
// fixtures, nunca para ejercitar el comportamiento que se está probando.
export function createTestAdminClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Role = 'admin' | 'auditor' | 'jefe';

// Crea un usuario real (vía Auth admin API, dispara handle_new_user de verdad)
// y devuelve un cliente logueado como ese usuario, para llamar RPCs/inserts
// pasando por las policies de RLS reales - no como superusuario.
export async function createTestActor(admin: SupabaseClient, role: Role) {
  const email = `test-${randomUUID()}@example.com`;
  const password = randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${role}`, role },
  });
  if (createError) throw createError;
  const userId = created.user.id;

  const client = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { client, userId, email };
}

export async function deleteTestUser(admin: SupabaseClient, userId: string) {
  await admin.auth.admin.deleteUser(userId);
}
