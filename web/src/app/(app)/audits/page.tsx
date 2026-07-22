import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue, ALL_LOCATIONS_VALUE } from '@/lib/location';
import { formatDateTime } from '@/lib/date';
import type { Audit } from '@/lib/types';
import { StartAuditForm } from './audits-client';
import { DeleteAuditButton } from './delete-button';

type AuditWithLocation = Audit & { locations?: { name: string } | null };

const PAGE_SIZE = 20;

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const profile = await requireProfile();
  const supabase = await createClient();
  const locations = await getLocations();
  const locationValue = await getSelectedLocationValue(locations);
  const isAllLocations = locationValue === ALL_LOCATIONS_VALUE;

  const { data: audits, count } = isAllLocations
    ? await supabase
        .from('audits')
        .select('*, profiles(full_name), locations(name)', { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(from, to)
    : locationValue
      ? await supabase
          .from('audits')
          .select('*, profiles(full_name)', { count: 'exact' })
          .eq('location_id', locationValue)
          .order('started_at', { ascending: false })
          .range(from, to)
      : { data: [], count: 0 };

  const auditList = (audits as AuditWithLocation[]) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canStart = (profile.role === 'admin' || profile.role === 'auditor') && locations.length > 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Auditorías</h1>

      {isAllLocations && (
        <p className="mb-4 text-sm text-foreground">Vista general: auditorías de todos los locales.</p>
      )}

      {canStart && (
        <StartAuditForm locations={locations} defaultLocationId={isAllLocations ? null : locationValue} />
      )}

      <h2 className="mb-3 text-lg font-medium text-foreground">Historial de auditorías</h2>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              {isAllLocations && <th className="px-4 py-2 font-medium">Local</th>}
              <th className="px-4 py-2 font-medium">Fecha inicio</th>
              <th className="px-4 py-2 font-medium">Fecha cierre</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Iniciada por</th>
              <th className="px-4 py-2 font-medium">Responsable</th>
              <th className="px-4 py-2 font-medium">Nota</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {auditList.length === 0 && (
              <tr>
                <td colSpan={isAllLocations ? 8 : 7} className="px-4 py-6 text-center text-foreground">
                  Todavía no se inició ninguna auditoría.
                </td>
              </tr>
            )}
            {auditList.map((a) => {
              const isOpen = !a.ended_at;
              return (
                <tr key={a.id} className="border-t border-zinc-100 hover:bg-background dark:border-zinc-800">
                  {isAllLocations && (
                    <td className="px-4 py-2 text-foreground">{a.locations?.name ?? '—'}</td>
                  )}
                  <td className="px-4 py-2 font-medium text-foreground">{formatDateTime(a.started_at)}</td>
                  <td className="px-4 py-2 text-foreground">
                    {a.ended_at ? formatDateTime(a.ended_at) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        isOpen
                          ? 'rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent'
                          : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }
                    >
                      {isOpen ? 'En curso' : 'Cerrada'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-foreground">{a.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{a.responsible_name ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{a.note ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Link href={`/audits/${a.id}`} className="mr-3 font-medium text-accent hover:underline">
                      Ver detalle
                    </Link>
                    {profile.role === 'admin' && <DeleteAuditButton auditId={a.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-foreground">
          <Link
            href={`/audits?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700 ${
              page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-background'
            }`}
          >
            ‹ Anterior
          </Link>
          <span>
            Página {page} de {totalPages}
          </span>
          <Link
            href={`/audits?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={`rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700 ${
              page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-background'
            }`}
          >
            Siguiente ›
          </Link>
        </div>
      )}
    </div>
  );
}
