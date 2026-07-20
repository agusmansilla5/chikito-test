import { createClient } from '@/lib/supabase/server';
import { getLocations, getSelectedLocationId } from '@/lib/location';
import type { Product, StockMovement } from '@/lib/types';
import { StatCard } from '../stat-card';
import { RealtimeRefresh } from './realtime-refresh';
import { ReportExport } from './report-export';
import { StockReportExport } from './stock-report-export';
import { MovementsChart } from './movements-chart';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number }[] };

export default async function DashboardPage() {
  const supabase = await createClient();
  const locations = await getLocations();
  const locationId = await getSelectedLocationId(locations);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [{ data: movements }, { data: lowStock }, { data: productsRaw }, { data: weekMovements }] =
    locationId
      ? await Promise.all([
          supabase
            .from('stock_movements')
            .select('*, products(name), profiles(full_name)')
            .eq('location_id', locationId)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase.from('low_stock_products').select('*').eq('location_id', locationId),
          supabase
            .from('products')
            .select('*, categories(name), product_stock!inner(quantity, min_stock)')
            .eq('active', true)
            .eq('product_stock.location_id', locationId)
            .order('name'),
          supabase
            .from('stock_movements')
            .select('type, quantity, created_at')
            .eq('location_id', locationId)
            .gte('created_at', sevenDaysAgo.toISOString()),
        ])
      : [{ data: [] }, { data: [] }, { data: [] as ProductWithStock[] }, { data: [] }];

  const movementList = (movements as StockMovement[]) ?? [];
  const lowStockList = (lowStock as Product[]) ?? [];
  const productList: Product[] = ((productsRaw as ProductWithStock[]) ?? []).map((p) => ({
    ...p,
    quantity: p.product_stock[0]?.quantity ?? 0,
    min_stock: p.product_stock[0]?.min_stock ?? 0,
  }));

  const todayKey = new Date().toDateString();
  const movementsToday = movementList.filter((m) => new Date(m.created_at).toDateString() === todayKey).length;

  const stockValue = productList.reduce((sum, p) => sum + p.quantity * (p.cost_price ?? 0), 0);
  const stockValueLabel = stockValue.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(sevenDaysAgo);
    day.setDate(day.getDate() + i);
    const dayKey = day.toDateString();
    const dayMovements = (weekMovements ?? []).filter((m) => new Date(m.created_at).toDateString() === dayKey);
    return {
      label: day.toLocaleDateString('es-AR', { weekday: 'short' }),
      entradas: dayMovements.filter((m) => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
      salidas: dayMovements.filter((m) => m.type === 'salida').reduce((s, m) => s + m.quantity, 0),
    };
  });

  return (
    <div>
      <RealtimeRefresh />

      <h1 className="mb-6 text-2xl font-semibold text-foreground">Panel de control</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Movimientos de hoy" value={movementsToday} />
        <StatCard label="Productos con stock bajo" value={lowStockList.length} />
        <StatCard label="Productos totales" value={productList.length} />
        <StatCard label="Valor de stock" value={stockValueLabel} />
      </div>

      <div className="mb-8">
        <MovementsChart data={chartData} />
      </div>

      {lowStockList.length > 0 && (
        <section className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900 dark:bg-red-950/40">
          <h2 className="mb-2 font-semibold text-red-800 dark:text-red-400">⚠ Stock bajo</h2>
          <ul className="space-y-1 text-sm text-red-800 dark:text-red-400">
            {lowStockList.map((p) => (
              <li key={p.id}>
                {p.name}: {p.quantity} (mínimo {p.min_stock})
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Stock actual</h2>
          <StockReportExport products={productList} />
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-4 py-2 font-medium">Rubro</th>
                <th className="px-4 py-2 font-medium">Stock</th>
                <th className="px-4 py-2 font-medium">Mínimo</th>
                <th className="px-4 py-2 font-medium">Falta pedir</th>
              </tr>
            </thead>
            <tbody>
              {productList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-foreground">
                    No hay productos cargados todavía.
                  </td>
                </tr>
              )}
              {productList.map((p) => {
                const missing = Math.max(0, p.min_stock - p.quantity);
                return (
                  <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-2 text-foreground">{p.categories?.name ?? 'Sin rubro'}</td>
                    <td className={`px-4 py-2 font-semibold ${missing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {p.quantity}
                    </td>
                    <td className="px-4 py-2 text-foreground">{p.min_stock}</td>
                    <td className="px-4 py-2">
                      {missing > 0 ? (
                        <span className="font-semibold text-red-600">{missing}</span>
                      ) : (
                        <span className="text-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Últimos movimientos</h2>
          <ReportExport movements={movementList} />
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
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
                    Todavía no hay movimientos registrados.
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
                          ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                          : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
                      }
                    >
                      {m.type === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{m.quantity}</td>
                  <td className="px-4 py-2">{m.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">
                    {new Date(m.created_at).toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
