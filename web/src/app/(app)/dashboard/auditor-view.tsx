import { createClient } from '@/lib/supabase/server';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import type { Product, Category, Area } from '@/lib/types';
import { StartAuditForm } from '../audits/audits-client';
import { CloseAuditButton } from '../audits/close-button';
import { CountSheetClient } from '../movement/count-sheet-client';
import { MovementClient } from '../movement/movement-client';
import { RealtimeRefresh } from './realtime-refresh';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

// Vista simplificada para el rol auditor: nada de estadísticas ni tablas
// generales, solo "qué sector vas a contar" y, una vez elegido, la planilla
// de conteo de ese sector - así el flujo queda enfocado en cargar la
// auditoría de punta a punta sin distracciones.
export async function AuditorView() {
  const supabase = await createClient();
  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);
  const isAllLocations = locationValue === ALL_LOCATIONS_VALUE;
  const focusLocationId = isAllLocations ? (locations[0]?.id ?? null) : locationValue;

  if (!focusLocationId) {
    return (
      <div>
        <RealtimeRefresh />
        <h1 className="mb-4 text-2xl font-semibold text-foreground">¿Qué stock vas a hacer?</h1>
        <p className="text-foreground">
          Todavía no hay ningún sector cargado. Pedile a un admin que cree uno en Ubicaciones.
        </p>
      </div>
    );
  }

  const { data: openAudit } = await supabase
    .from('audits')
    .select('id, note')
    .eq('location_id', focusLocationId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openAudit) {
    return (
      <div>
        <RealtimeRefresh />
        <h1 className="mb-6 text-2xl font-semibold text-foreground">¿Qué stock vas a hacer?</h1>
        <StartAuditForm locations={locations} defaultLocationId={focusLocationId} heading="Elegí el sector" />
      </div>
    );
  }

  const [{ data: productsRaw }, { data: categoriesData }, { data: areasData }] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(name), areas(name), product_stock!inner(quantity, min_stock)')
      .eq('active', true)
      .eq('product_stock.location_id', focusLocationId)
      .order('name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('areas').select('*').order('name'),
  ]);

  const products = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
    ...p,
    quantity: p.product_stock[0]?.quantity ?? 0,
    min_stock: p.product_stock[0]?.min_stock ?? 0,
  }));

  const currentLocationName = locations.find((l) => l.id === focusLocationId)?.name ?? '';

  return (
    <div>
      <RealtimeRefresh />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auditoría en curso: {currentLocationName}</h1>
          {openAudit.note && <p className="mt-1 text-sm italic text-foreground">{openAudit.note}</p>}
        </div>
        <CloseAuditButton auditId={openAudit.id} redirectTo={`/audits/${openAudit.id}`} />
      </div>

      <h2 className="mb-3 text-lg font-medium text-foreground">Conteo</h2>
      <CountSheetClient products={products} />

      <h2 className="mb-3 text-lg font-medium text-foreground">Agregar un producto que falte en la lista</h2>
      <MovementClient
        initialProducts={products}
        initialCategories={(categoriesData as Category[]) ?? []}
        initialAreas={(areasData as Area[]) ?? []}
        openAuditNote={openAudit.note}
      />
    </div>
  );
}
