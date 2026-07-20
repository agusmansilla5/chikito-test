import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Audit, StockMovement } from '@/lib/types';
import { CloseAuditButton } from '../close-button';
import { NoteEditor } from '../note-editor';
import { AuditExport } from '../audit-export';

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: audit }, { data: movements }] = await Promise.all([
    supabase.from('audits').select('*, profiles(full_name)').eq('id', id).single(),
    supabase
      .from('stock_movements')
      .select('*, products(name, quantity, min_stock), profiles(full_name)')
      .eq('audit_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!audit) {
    return (
      <div>
        <p className="text-foreground/60">No se encontró la auditoría.</p>
      </div>
    );
  }

  const auditData = audit as Audit;
  type MovementWithStock = StockMovement & {
    products: { name: string; quantity: number; min_stock: number } | null;
  };
  const movementList = (movements as MovementWithStock[]) ?? [];
  const isOpen = !auditData.ended_at;
  const canClose = profile.role === 'admin' || profile.role === 'auditor';

  const summaryMap = new Map<
    string,
    { name: string; entradas: number; salidas: number; stockFinal: number; minStock: number }
  >();
  for (const m of movementList) {
    if (!summaryMap.has(m.product_id)) {
      summaryMap.set(m.product_id, {
        name: m.products?.name ?? 'Producto',
        entradas: 0,
        salidas: 0,
        stockFinal: m.products?.quantity ?? 0,
        minStock: m.products?.min_stock ?? 0,
      });
    }
    const row = summaryMap.get(m.product_id)!;
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
            Auditoría del {new Date(auditData.started_at).toLocaleDateString('es-AR', { dateStyle: 'long' })}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Inicio: {new Date(auditData.started_at).toLocaleString('es-AR')}
            {auditData.ended_at && ` · Cierre: ${new Date(auditData.ended_at).toLocaleString('es-AR')}`}
            {' · '}
            {auditData.profiles?.full_name ?? '—'}
          </p>
          {canClose ? (
            <NoteEditor auditId={auditData.id} initialNote={auditData.note} />
          ) : (
            auditData.note && <p className="mt-1 text-sm italic text-foreground/60">{auditData.note}</p>
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
          {isOpen && canClose && <CloseAuditButton auditId={auditData.id} />}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Productos cargados ({summary.length})</h2>
        <AuditExport audit={auditData} summary={summary} />
      </div>
      <div className="mb-8 overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground/60">
            <tr>
              <th className="px-4 py-2 font-medium">Producto</th>
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
                <td colSpan={7} className="px-4 py-6 text-center text-foreground/40">
                  Todavía no se cargó ningún producto en esta auditoría.
                </td>
              </tr>
            )}
            {summary.map((s) => (
              <tr key={s.name} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-2 text-foreground/60">{s.stockInicial}</td>
                <td className="px-4 py-2 text-green-600">{s.entradas > 0 ? `+${s.entradas}` : '—'}</td>
                <td className="px-4 py-2 text-red-600">{s.salidas > 0 ? `-${s.salidas}` : '—'}</td>
                <td className={`px-4 py-2 font-semibold ${s.faltaPedir > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {s.stockFinal}
                </td>
                <td className="px-4 py-2 text-foreground/60">{s.minStock}</td>
                <td className="px-4 py-2">
                  {s.faltaPedir > 0 ? (
                    <span className="font-semibold text-red-600">{s.faltaPedir}</span>
                  ) : (
                    <span className="text-foreground/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-medium text-foreground">Detalle de movimientos</h2>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground/60">
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
                <td colSpan={5} className="px-4 py-6 text-center text-foreground/40">
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
                <td className="px-4 py-2">{m.quantity}</td>
                <td className="px-4 py-2">{m.profiles?.full_name ?? '—'}</td>
                <td className="px-4 py-2 text-foreground/60">{new Date(m.created_at).toLocaleString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
