import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getSelectedLocationValue, getLocations, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Supplier, SupplierProduct } from '@/lib/types';
import { NewPurchaseOrderClient } from './new-purchase-order-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number; location_id: string }[] };

export default async function NewPurchaseOrderPage() {
  const profile = await requireProfile();

  if (profile.role === 'jefe') {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Nuevo pedido</h1>
        <p className="text-sm text-foreground">Tu rol (jefe) solo tiene acceso de lectura a los reportes.</p>
      </div>
    );
  }

  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);

  if (locationValue === ALL_LOCATIONS_VALUE) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Nuevo pedido</h1>
        <p className="text-sm text-foreground">
          Estás en la vista general. Elegí un local en el menú para crear un pedido ahí.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const location = locations.find((l) => l.id === locationValue);

  const [{ data: suppliers }, { data: supplierProducts }, { data: productsRaw }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('supplier_products').select('*, products(name)').order('created_at'),
    supabase.from('products').select('*, categories(name), product_stock(quantity, min_stock, location_id)').eq('active', true).order('name'),
  ]);

  const products: Product[] = ((productsRaw as ProductWithStock[]) ?? []).map((p) => {
    const stock = p.product_stock.find((ps) => ps.location_id === locationValue);
    return { ...p, quantity: stock?.quantity ?? 0, min_stock: stock?.min_stock ?? 0 };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Nuevo pedido</h1>
      <NewPurchaseOrderClient
        initialSuppliers={(suppliers as Supplier[]) ?? []}
        supplierProducts={(supplierProducts as SupplierProduct[]) ?? []}
        products={products}
        locationId={locationValue as string}
        locationName={location?.name ?? ''}
      />
    </div>
  );
}
