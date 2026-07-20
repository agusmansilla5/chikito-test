import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Category } from '@/lib/types';
import { MovementClient } from './movement-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

export default async function MovementPage() {
  const profile = await requireProfile();

  if (profile.role === 'jefe') {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Registrar movimiento</h1>
        <p className="text-sm text-foreground">Tu rol (jefe) solo tiene acceso de lectura a los reportes.</p>
      </div>
    );
  }

  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);

  if (locationValue === ALL_LOCATIONS_VALUE) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Registrar movimiento</h1>
        <p className="text-sm text-foreground">
          Estás en la vista general. Elegí un local en el menú para registrar un movimiento ahí.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const locationId = locationValue;

  const [{ data: productsRaw }, { data: categories }, { data: openAudit }] = await Promise.all([
    locationId
      ? supabase
          .from('products')
          .select('*, categories(name), product_stock!inner(quantity, min_stock)')
          .eq('active', true)
          .eq('product_stock.location_id', locationId)
          .order('name')
      : Promise.resolve({ data: [] as ProductWithStock[] }),
    supabase.from('categories').select('*').order('name'),
    locationId
      ? supabase
          .from('audits')
          .select('note')
          .eq('location_id', locationId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const products: Product[] = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
    ...p,
    quantity: p.product_stock[0]?.quantity ?? 0,
    min_stock: p.product_stock[0]?.min_stock ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Registrar movimiento</h1>
      <MovementClient
        initialProducts={products}
        initialCategories={(categories as Category[]) ?? []}
        openAuditNote={openAudit ? (openAudit.note ?? null) : undefined}
      />
    </div>
  );
}
