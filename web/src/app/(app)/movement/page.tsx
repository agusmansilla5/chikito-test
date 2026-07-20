import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Product, Category } from '@/lib/types';
import { MovementClient } from './movement-client';

export default async function MovementPage() {
  const profile = await requireProfile();

  if (profile.role === 'jefe') {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Registrar movimiento</h1>
        <p className="text-sm text-foreground/60">Tu rol (jefe) solo tiene acceso de lectura a los reportes.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: products }, { data: categories }, { data: openAudit }] = await Promise.all([
    supabase.from('products').select('*, categories(name)').order('name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('audits').select('note').is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Registrar movimiento</h1>
      <MovementClient
        initialProducts={(products as Product[]) ?? []}
        initialCategories={(categories as Category[]) ?? []}
        openAuditNote={openAudit ? (openAudit.note ?? null) : undefined}
      />
    </div>
  );
}
