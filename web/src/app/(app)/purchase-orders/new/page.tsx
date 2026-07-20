import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getSelectedLocationValue, getLocations, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Supplier } from '@/lib/types';
import { NewPurchaseOrderClient } from './new-purchase-order-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

export default async function NewPurchaseOrderPage() {
  const profile = await requireProfile();

  if (profile.role === 'jefe') {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Nueva orden de compra</h1>
        <p className="text-sm text-foreground">Tu rol (jefe) solo tiene acceso de lectura a los reportes.</p>
      </div>
    );
  }

  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);

  if (locationValue === ALL_LOCATIONS_VALUE) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Nueva orden de compra</h1>
        <p className="text-sm text-foreground">
          Estás en la vista general. Elegí un local en el menú para crear una orden ahí.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: suppliers }, { data: productsRaw }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    locationValue
      ? supabase
          .from('products')
          .select('*, categories(name), product_stock!inner(quantity, min_stock)')
          .eq('active', true)
          .eq('product_stock.location_id', locationValue)
          .order('name')
      : Promise.resolve({ data: [] as ProductWithStock[] }),
  ]);

  const products: Product[] = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
    ...p,
    quantity: p.product_stock[0]?.quantity ?? 0,
    min_stock: p.product_stock[0]?.min_stock ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Nueva orden de compra</h1>
      <NewPurchaseOrderClient initialSuppliers={(suppliers as Supplier[]) ?? []} products={products} />
    </div>
  );
}
