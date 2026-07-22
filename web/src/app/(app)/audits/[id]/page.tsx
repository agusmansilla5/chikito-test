import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { formatDate, formatDateTime } from '@/lib/date';
import type { Audit, StockMovement, Product, Category, Area, Unit } from '@/lib/types';
import { NoteEditor } from '../note-editor';
import { AuditExport } from '../audit-export';
import { MovementClient } from '../../movement/movement-client';
import { CountSheetClient } from '../../movement/count-sheet-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: audit } = await supabase.from('audits').select('*, profiles(full_name)').eq('id', id).single();

  if (!audit) {
    return (
      <div>
        <p className="text-foreground">No se encontró la auditoría.</p>
      </div>
    );
  }

  const auditData = audit as Audit;

  const { data: movements } = await supabase
    .from('stock_movements')
    .select('*, products(name), profiles(full_name)')
    .eq('audit_id', id)
    .order('created_at', { ascending: false });

  const movementList = (movements as StockMovement[]) ?? [];

  const productIds = Array.from(new Set(movementList.map((m) => m.product_id)));
  const { data: stockRows } =
    productIds.length > 0
      ? await supabase
          .from('product_stock')
          .select('product_id, quantity, min_stock')
          .eq('location_id', auditData.location_id)
          .in('product_id', productIds)
      : { data: [] };
  const stockByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, r]));
  const isOpen = !auditData.ended_at;
  // La policy de RLS ahora exige lo mismo: admin gestiona cualquier auditoría,
  // auditor solo las que inició él mismo (ver restrict_audit_close_to_owner.sql).
  const canClose = profile.role === 'admin' || (profile.role === 'auditor' && auditData.started_by === profile.id);
  // Cargar productos no depende de quién inició la auditoría - cualquier
  // admin/auditor puede ir sumando el conteo mientras esté en curso.
  const canLoadProducts = profile.role === 'admin' || profile.role === 'auditor';

  let auditProducts: Product[] = [];
  let auditCategories: Category[] = [];
  let auditAreas: Area[] = [];

  if (isOpen && canLoadProducts) {
    const [{ data: productsRaw }, { data: categoriesData }, { data: areasData }] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(name), areas(name), product_stock!inner(quantity, min_stock)')
        .eq('active', true)
        .eq('product_stock.location_id', auditData.location_id)
        .order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('areas').select('*').order('name'),
    ]);
    auditProducts = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
      ...p,
      quantity: p.product_stock[0]?.quantity ?? 0,
      min_stock: p.product_stock[0]?.min_stock ?? 0,
    }));
    auditCategories = (categoriesData as Category[]) ?? [];
    auditAreas = (areasData as Area[]) ?? [];
  }

  // Se agrupa por (producto, unidad) en vez de por producto solo: si un mismo
  // producto se cargó con distintas unidades dentro de la auditoría (ej. una
  // vez en kg y otra en gr), sumarlas ciegamente daría un número sin sentido.
  // Cada combinación producto+unidad queda como su propia fila.
  const summaryMap = new Map<
    string,
    { name: string; unit: Unit; entradas: number; salidas: number; stockFinal: number; minStock: number }
  >();
  for (const m of movementList) {
    const key = `${m.product_id}::${m.unit ?? 'u'}`;
    if (!summaryMap.has(key)) {
      const stock = stockByProduct.get(m.product_id);
      summaryMap.set(key, {
        name: m.products?.name ?? 'Producto',
        unit: m.unit ?? 'u',
        entradas: 0,
        salidas: 0,
        stockFinal: stock?.quantity ?? 0,
        minStock: stock?.min_stock ?? 0,
      });
    }
    const row = summaryMap.get(key)!;
    if (m.type === 'entrada') row.entradas += m.quantity;
    else row.salidas += m.quantity;
  }
  const summary = Array.from(summaryMap.values())
    .map((s) => ({
      ...s,
      stockInicial: s.stockFinal - s.entradas + s.salidas,
      faltaPedir: Math.max(0, s.minStock - s.stockFinal),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <Link href="/audits" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Volver a auditorías
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Auditoría del {formatDate(auditData.started_at)}
          </h1>
          <p className="mt-1 text-sm text-foreground">
            Inicio: {formatDateTime(auditData.started_at)}
            {auditData.ended_at && ` · Cierre: ${formatDateTime(auditData.ended_at)}`}
            {' · '}
            {auditData.profiles?.full_name ?? '—'}
          </p>
          <p className="mt-1 text-sm text-foreground">
            Responsable del stock: <span className="font-medium">{auditData.responsible_name ?? '—'}</span>
          </p>
          {canClose ? (
            <NoteEditor auditId={auditData.id} initialNote={auditData.note} />
          ) : (
            auditData.note && <p className="mt-1 text-sm italic text-foreground">{auditData.note}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              isOpen
                ? 'rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent'
                : 'rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
            }
          >
            {isOpen ? 'En curso' : 'Cerrada'}
          </span>
        </div>
      </div>

      {isOpen && canLoadProducts && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-foreground">Conteo</h2>
          <CountSheetClient products={auditProducts} auditId={auditData.id} canClose={canClose} />
          <h2 className="mb-3 text-lg font-medium text-foreground">Agregar un producto que falte en la lista</h2>
          <MovementClient
            initialProducts={auditProducts}
            initialCategories={auditCategories}
            initialAreas={auditAreas}
            openAuditNote={auditData.note}
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Productos cargados ({summary.length})</h2>
        <AuditExport audit={auditData} summary={summary} />
      </div>
      <div className="mb-8 overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium">Unidad</th>
              <th className="px-4 py-2 font-medium">Stock inicial</th>
              <th className="px-4 py-2 font-medium">Entradas</th>
              <th className="px-4 py-2 font-medium">Salidas</th>
              <th className="px-4 py-2 font-medium">Stock final</th>
              <th className="px-4 py-2 font-medium">Mínimo</th>
              <th className="px-4 py-2 font-medium">Falta pedir</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-foreground">
                  Todavía no se cargó ningún producto en esta auditoría.
                </td>
              </tr>
            )}
            {summary.map((s) => (
              <tr key={`${s.name}::${s.unit}`} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-2 text-foreground">{s.unit}</td>
                <td className="px-4 py-2 text-foreground">{s.stockInicial}</td>
                <td className="px-4 py-2 text-green-600">{s.entradas > 0 ? `+${s.entradas}` : '—'}</td>
                <td className="px-4 py-2 text-red-600">{s.salidas > 0 ? `-${s.salidas}` : '—'}</td>
                <td className={`px-4 py-2 font-semibold ${s.faltaPedir > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {s.stockFinal}
                </td>
                <td className="px-4 py-2 text-foreground">{s.minStock}</td>
                <td className="px-4 py-2">
                  {s.faltaPedir > 0 ? (
                    <span className="font-semibold text-red-600">{s.faltaPedir}</span>
                  ) : (
                    <span className="text-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-medium text-foreground">Detalle de movimientos</h2>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movementList.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground">
                  Sin movimientos.
                </td>
              </tr>
            )}
            {movementList.map((m) => (
              <tr key={m.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2">{m.products?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      m.type === 'entrada'
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400'
                        : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400'
                    }
                  >
                    {m.type === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {m.quantity} {m.unit ?? 'u'}
                </td>
                <td className="px-4 py-2">{m.profiles?.full_name ?? '—'}</td>
                <td className="px-4 py-2 text-foreground">{formatDateTime(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
