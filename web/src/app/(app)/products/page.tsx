import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Product, Category } from '@/lib/types';
import { ProductsClient } from './products-client';

export default async function ProductsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, categories(name)').order('name'),
    supabase.from('categories').select('*').order('name'),
  ]);

  const canEdit = profile.role === 'admin' || profile.role === 'auditor';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Productos</h1>

      <ProductsClient
        initialProducts={(products as Product[]) ?? []}
        initialCategories={(categories as Category[]) ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
