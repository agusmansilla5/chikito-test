import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';
import { UsersClient, type UserRow } from './users-client';

export default async function UsersPage() {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/dashboard');

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Usuarios</h1>
        <p className="text-sm text-foreground">
          Falta configurar la variable de entorno <code>SUPABASE_SERVICE_ROLE_KEY</code> (Vercel → Settings →
          Environment Variables, tomando el valor de service_role en Supabase → Settings → API) para poder
          gestionar usuarios desde acá.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');

  const admin = createAdminClient();
  const {
    data: { users: authUsers },
  } = await admin.auth.admin.listUsers();

  const authById = new Map(authUsers.map((u) => [u.id, u]));
  const users: UserRow[] = ((profiles as Profile[]) ?? []).map((p) => {
    const authUser = authById.get(p.id);
    const bannedUntil = authUser?.banned_until;
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      email: authUser?.email ?? null,
      active: !bannedUntil || new Date(bannedUntil) <= new Date(),
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Usuarios</h1>
      <UsersClient initialUsers={users} currentUserId={profile.id} />
    </div>
  );
}
