import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Supplier, SupplierProduct, Product } from '@/lib/types';
import { ModuleTabs } from '../purchase-orders/module-tabs';
import { SuppliersClient } from './suppliers-client';

export default async function SuppliersPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: suppliers }, { data: supplierProducts }, { data: products }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('supplier_products').select('*, products(name)').order('created_at'),
    supabase.from('products').select('*').eq('active', true).order('name'),
  ]);

  const canEdit = profile.role === 'admin' || profile.role === 'auditor';

  return (
    <div>
      <ModuleTabs />
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Proveedores</h1>
      <SuppliersClient
        initialSuppliers={(suppliers as Supplier[]) ?? []}
        initialSupplierProducts={(supplierProducts as SupplierProduct[]) ?? []}
        products={(products as Product[]) ?? []}
        canEdit={canEdit}
        isAdmin={profile.role === 'admin'}
      />
    </div>
  );
}
