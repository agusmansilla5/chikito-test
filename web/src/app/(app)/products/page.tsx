import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationId } from '@/lib/location';
import type { Product, Category } from '@/lib/types';
import { ProductsClient } from './products-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

export default async function ProductsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const locations = await getLocations();
  const locationId = await getSelectedLocationId(locations);

  const [{ data: productsRaw }, { data: categories }] = await Promise.all([
    locationId
      ? supabase
          .from('products')
          .select('*, categories(name), product_stock!inner(quantity, min_stock)')
          .eq('active', true)
          .eq('product_stock.location_id', locationId)
          .order('name')
      : Promise.resolve({ data: [] as ProductWithStock[] }),
    supabase.from('categories').select('*').order('name'),
  ]);

  const products: Product[] = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
    ...p,
    quantity: p.product_stock[0]?.quantity ?? 0,
    min_stock: p.product_stock[0]?.min_stock ?? 0,
  }));

  const canEdit = profile.role === 'admin' || profile.role === 'auditor';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Productos</h1>

      <ProductsClient
        initialProducts={products}
        initialCategories={(categories as Category[]) ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
