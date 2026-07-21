import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Category, Area } from '@/lib/types';
import { ImportClient } from './import-client';

type ProductRaw = Product & { categories?: { name: string } | null; areas?: { name: string } | null };
type StockRow = { product_id: string; quantity: number; min_stock: number };

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

  // Trae TODOS los productos activos (no solo los que ya tienen fila de stock
  // en este local): un producto puede existir globalmente por haberse creado
  // en otro local y todavía no tener conteo acá, y el importador tiene que
  // reconocerlo igual en vez de tratarlo como si fuera nuevo.
  const [{ data: categories }, { data: areas }, { data: productsRaw }, { data: stockRows }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('areas').select('*').order('name'),
    supabase.from('products').select('*, categories(name), areas(name)').eq('active', true).order('name'),
    locationValue
      ? supabase.from('product_stock').select('product_id, quantity, min_stock').eq('location_id', locationValue)
      : Promise.resolve({ data: [] as StockRow[] }),
  ]);

  const stockByProduct = new Map((stockRows as StockRow[] | null)?.map((r) => [r.product_id, r]));
  const products: Product[] = ((productsRaw as ProductRaw[]) ?? []).map((p) => ({
    ...p,
    quantity: stockByProduct.get(p.id)?.quantity ?? 0,
    min_stock: stockByProduct.get(p.id)?.min_stock ?? 0,
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
