import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Audit } from '@/lib/types';
import { StartAuditForm } from './audits-client';

export default async function AuditsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: audits } = await supabase
    .from('audits')
    .select('*, profiles(full_name)')
    .order('started_at', { ascending: false });

  const auditList = (audits as Audit[]) ?? [];
  const canStart = profile.role === 'admin' || profile.role === 'auditor';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Auditorías</h1>

      {canStart && <StartAuditForm />}

      <h2 className="mb-3 text-lg font-medium text-zinc-900">Historial de auditorías</h2>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha inicio</th>
              <th className="px-4 py-2 font-medium">Fecha cierre</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Iniciada por</th>
              <th className="px-4 py-2 font-medium">Nota</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {auditList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  Todavía no se inició ninguna auditoría.
                </td>
              </tr>
            )}
            {auditList.map((a) => {
              const isOpen = !a.ended_at;
              return (
                <tr key={a.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-2 font-medium text-zinc-900">
                    {new Date(a.started_at).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {a.ended_at
                      ? new Date(a.ended_at).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        isOpen
                          ? 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700'
                          : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600'
                      }
                    >
                      {isOpen ? 'En curso' : 'Cerrada'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-500">{a.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-500">{a.note ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Link href={`/audits/${a.id}`} className="font-medium text-blue-600 hover:underline">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
