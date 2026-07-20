import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Category } from '@/lib/types';
import { ProductsClient } from './products-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };
type StockRow = { product_id: string; quantity: number; min_stock: number };

export default async function ProductsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);
  const isAllLocations = locationValue === ALL_LOCATIONS_VALUE;

  const { data: categories } = await supabase.from('categories').select('*').order('name');

  let products: Product[] = [];

  if (isAllLocations) {
    const { data: productsRaw } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .order('name');
    const { data: stockRows } = await supabase.from('product_stock').select('product_id, quantity, min_stock');
    const stockByProduct = new Map<string, { quantity: number; min_stock: number }>();
    for (const row of (stockRows as StockRow[]) ?? []) {
      const acc = stockByProduct.get(row.product_id) ?? { quantity: 0, min_stock: 0 };
      acc.quantity += row.quantity;
      acc.min_stock += row.min_stock;
      stockByProduct.set(row.product_id, acc);
    }
    products = ((productsRaw as Product[]) ?? []).map((p) => ({
      ...p,
      quantity: stockByProduct.get(p.id)?.quantity ?? 0,
      min_stock: stockByProduct.get(p.id)?.min_stock ?? 0,
    }));
  } else if (locationValue) {
    const { data: productsRaw } = await supabase
      .from('products')
      .select('*, categories(name), product_stock!inner(quantity, min_stock)')
      .eq('active', true)
      .eq('product_stock.location_id', locationValue)
      .order('name');
    products = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
      ...p,
      quantity: p.product_stock[0]?.quantity ?? 0,
      min_stock: p.product_stock[0]?.min_stock ?? 0,
    }));
  }

  const canEdit = (profile.role === 'admin' || profile.role === 'auditor') && !isAllLocations;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Productos</h1>
      {isAllLocations && (
        <p className="mb-4 text-sm text-foreground">
          Vista general: suma el stock de todos los locales. Elegí un local en el menú para editar productos.
        </p>
      )}

      <ProductsClient
        initialProducts={products}
        initialCategories={(categories as Category[]) ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
