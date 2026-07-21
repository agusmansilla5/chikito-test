import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Category, Area } from '@/lib/types';
import { ImportClient } from './import-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

export default async function ImportStockPage() {
  const profile = await requireProfile();

  if (profile.role === 'jefe') {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Importar conteo de stock</h1>
        <p className="text-sm text-foreground">Tu rol (jefe) solo tiene acceso de lectura a los reportes.</p>
      </div>
    );
  }

  const locationValue = await getSelectedLocationValue();

  if (locationValue === ALL_LOCATIONS_VALUE) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Importar conteo de stock</h1>
        <p className="text-sm text-foreground">
          Estás en la vista general. Elegí un local en el menú para importar un conteo ahí.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: categories }, { data: areas }, { data: productsRaw }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('areas').select('*').order('name'),
    locationValue
      ? supabase
          .from('products')
          .select('*, categories(name), areas(name), product_stock!inner(quantity, min_stock)')
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
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Importar conteo de stock</h1>
      <p className="mb-6 text-sm text-foreground">
        Subí un Excel con el formato de la planilla de conteo (Producto, Rubro, Área, Mínimo, Stock contado). Los
        productos que no existan se crean; los que ya existen solo actualizan su stock según lo contado.
      </p>
      <ImportClient
        products={products}
        categories={(categories as Category[]) ?? []}
        areas={(areas as Area[]) ?? []}
      />
    </div>
  );
}
