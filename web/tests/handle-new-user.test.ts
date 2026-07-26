import { afterEach, describe, expect, it } from 'vitest';
import { createTestAdminClient, deleteTestUser } from './helpers/supabase-test-client';
import { randomUUID } from 'crypto';

const admin = createTestAdminClient();

let userId: string | undefined;

afterEach(async () => {
  if (userId) await deleteTestUser(admin, userId);
  userId = undefined;
});

async function profileFor(id: string) {
  const { data, error } = await admin.from('profiles').select('full_name, role').eq('id', id).single();
  if (error) throw error;
  return data;
}

describe('handle_new_user trigger', () => {
  it('crea el perfil con full_name y role tomados de raw_user_meta_data', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: 'Nombre De Prueba', role: 'auditor' },
    });
    if (error) throw error;
    userId = data.user.id;

    const profile = await profileFor(userId);
    expect(profile.full_name).toBe('Nombre De Prueba');
    expect(profile.role).toBe('auditor');
  });

  it('si no viene full_name/role, usa el email y "auditor" como fallback', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;

    const profile = await profileFor(userId);
    expect(profile.full_name).toBe(email);
    expect(profile.role).toBe('auditor');
  });

  it('respeta un role distinto de auditor si viene en los metadatos', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { role: 'admin' },
    });
    if (error) throw error;
    userId = data.user.id;

    const profile = await profileFor(userId);
    expect(profile.role).toBe('admin');
  });
});
