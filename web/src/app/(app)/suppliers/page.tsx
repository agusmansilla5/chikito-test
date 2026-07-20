import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Supplier } from '@/lib/types';
import { SuppliersClient } from './suppliers-client';

export default async function SuppliersPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: suppliers } = await supabase.from('suppliers').select('*').order('name');

  const canEdit = profile.role === 'admin' || profile.role === 'auditor';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Proveedores</h1>
      <SuppliersClient initialSuppliers={(suppliers as Supplier[]) ?? []} canEdit={canEdit} isAdmin={profile.role === 'admin'} />
    </div>
  );
}
