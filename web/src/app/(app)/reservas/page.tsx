import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { VENUE_LABEL, type Reservation, type ReservationChipOption, type ReservationVenue } from '@/lib/types';
import { formatPlainDate } from '@/lib/date';
import { StatCard } from '../stat-card';
import { ReservasFilters } from './reservas-filters';
import { ReservasExport, type ReservationExportRow } from './reservas-export';
import { ReservasClient } from './reservas-client';

const PAGE_SIZE = 20;
const RESERVATION_SELECT =
  '*, promo:reservation_chip_options!promo_chip_id(id,label,color), reservation_tag_links(reservation_chip_options(id,label,color))';

function isVenue(value: string | undefined): value is ReservationVenue {
  return !!value && value in VENUE_LABEL;
}

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; venue?: string; from?: string; to?: string; search?: string }>;
}) {
  const { page: pageParam, venue: venueFilter, from: dateFrom, to: dateTo, search } = await searchParams;

  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/dashboard');

  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  function applyFilters<T>(query: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = query as any;
    if (isVenue(venueFilter)) q = q.eq('venue', venueFilter);
    if (dateFrom) q = q.gte('event_at', `${dateFrom}T00:00:00`);
    if (dateTo) q = q.lte('event_at', `${dateTo}T23:59:59`);
    if (search && search.trim()) q = q.or(`customer_name.ilike.%${search.trim()}%,customer_phone.ilike.%${search.trim()}%`);
    return q;
  }

  const { data: reservationsData, count } = await applyFilters(
    supabase.from('reservations').select(RESERVATION_SELECT, { count: 'exact' })
  )
    .order('event_at', { ascending: true })
    .range(from, to);

  const { data: exportData } = await applyFilters(supabase.from('reservations').select(RESERVATION_SELECT)).order(
    'event_at',
    { ascending: true }
  );

  const { data: chipOptionsData } = await supabase
    .from('reservation_chip_options')
    .select('*')
    .order('created_at', { ascending: true });

  const chipOptions = (chipOptionsData as ReservationChipOption[]) ?? [];
  const promoChips = chipOptions.filter((c) => c.kind === 'promo');
  const tagChips = chipOptions.filter((c) => c.kind === 'tag');

  const reservations = (reservationsData as unknown as Reservation[]) ?? [];
  const allFiltered = (exportData as unknown as Reservation[]) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const totals = allFiltered.reduce(
    (acc, r) => ({
      total: acc.total + r.total_amount,
      deposit: acc.deposit + r.deposit_amount,
    }),
    { total: 0, deposit: 0 }
  );
  const pending = Math.max(0, totals.total - totals.deposit);

  const exportRows: ReservationExportRow[] = allFiltered.map((r) => ({
    venue: r.venue,
    eventAt: r.event_at,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    promoLabel: r.promo?.label ?? null,
    isGift: r.is_gift,
    totalAmount: r.total_amount,
    depositAmount: r.deposit_amount,
    tagLabels: r.reservation_tag_links?.map((l) => l.reservation_chip_options.label) ?? [],
  }));

  const filterLabel = [
    isVenue(venueFilter) ? VENUE_LABEL[venueFilter] : 'Todas las sedes',
    dateFrom ? `desde ${formatPlainDate(dateFrom)}` : null,
    dateTo ? `hasta ${formatPlainDate(dateTo)}` : null,
  ]
    .filter(Boolean)
    .join(' — ');

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (isVenue(venueFilter)) params.set('venue', venueFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (search) params.set('search', search);
    params.set('page', String(targetPage));
    return `/reservas?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Gestión de Reservas</h1>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de reservas" value={count ?? 0} />
        <StatCard label="Monto total recaudado/proyectado" value={totals.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} />
        <StatCard label="Total en señas cobradas" value={totals.deposit.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} />
        <StatCard label="Saldo pendiente de cobro" value={pending.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} />
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ReservasFilters />
        <ReservasExport rows={exportRows} filterLabel={filterLabel} />
      </div>

      <ReservasClient
        reservations={reservations}
        promoChips={promoChips}
        tagChips={tagChips}
        defaultVenue={isVenue(venueFilter) ? venueFilter : 'nido'}
      />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-foreground">
          <Link
            href={pageHref(page - 1)}
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
            href={pageHref(page + 1)}
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
