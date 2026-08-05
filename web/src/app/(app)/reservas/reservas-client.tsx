'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { VENUE_LABEL, type Reservation, type ReservationChipOption, type ReservationVenue } from '@/lib/types';
import { formatDateTime } from '@/lib/date';
import { deleteReservation } from './actions';
import { ReservationModal } from './reservation-modal';

function chipPillStyle(color: string) {
  return { backgroundColor: `${color}22`, color, borderColor: `${color}66` };
}

function currency(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

export function ReservasClient({
  reservations,
  promoChips: initialPromoChips,
  tagChips: initialTagChips,
  defaultVenue,
}: {
  reservations: Reservation[];
  promoChips: ReservationChipOption[];
  tagChips: ReservationChipOption[];
  defaultVenue: ReservationVenue;
}) {
  const router = useRouter();
  const [promoChips, setPromoChips] = useState(initialPromoChips);
  const [tagChips, setTagChips] = useState(initialTagChips);
  const [editing, setEditing] = useState<Reservation | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleChipsChange(kind: 'promo' | 'tag', chips: ReservationChipOption[]) {
    if (kind === 'promo') setPromoChips(chips);
    else setTagChips(chips);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta reserva?')) return;
    setDeletingId(id);
    const result = await deleteReservation(id);
    setDeletingId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          + Nueva reserva
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Sede</th>
              <th className="px-4 py-2 font-medium">Fecha y hora</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Teléfono</th>
              <th className="px-4 py-2 font-medium">Promo</th>
              <th className="px-4 py-2 font-medium">Regalo</th>
              <th className="px-4 py-2 font-medium">Monto</th>
              <th className="px-4 py-2 font-medium">Seña</th>
              <th className="px-4 py-2 font-medium">Saldo</th>
              <th className="px-4 py-2 font-medium">Etiquetas</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-foreground">
                  No se encontraron reservas con estos filtros.
                </td>
              </tr>
            )}
            {reservations.map((r) => {
              const tags = r.reservation_tag_links?.map((l) => l.reservation_chip_options) ?? [];
              return (
                <tr key={r.id} className="border-t border-zinc-100 hover:bg-background dark:border-zinc-800">
                  <td className="px-4 py-2 text-foreground">{VENUE_LABEL[r.venue]}</td>
                  <td className="px-4 py-2 text-foreground">{formatDateTime(r.event_at)}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{r.customer_name}</td>
                  <td className="px-4 py-2 text-foreground">{r.customer_phone ?? '—'}</td>
                  <td className="px-4 py-2">
                    {r.promo ? (
                      <span
                        style={chipPillStyle(r.promo.color)}
                        className="rounded-full border px-2 py-0.5 text-xs font-medium"
                      >
                        {r.promo.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 text-foreground">{r.is_gift ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-2 text-foreground">{currency(r.total_amount)}</td>
                  <td className="px-4 py-2 text-foreground">{currency(r.deposit_amount)}</td>
                  <td className="px-4 py-2 text-foreground">{currency(Math.max(0, r.total_amount - r.deposit_amount))}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span
                          key={t.id}
                          style={chipPillStyle(t.color)}
                          className="rounded-full border px-2 py-0.5 text-xs font-medium"
                        >
                          {t.label}
                        </span>
                      ))}
                      {tags.length === 0 && '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => setEditing(r)} className="font-medium text-accent hover:underline">
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <ReservationModal
          reservation={editing === 'new' ? null : editing}
          promoChips={promoChips}
          tagChips={tagChips}
          defaultVenue={defaultVenue}
          onClose={() => setEditing(null)}
          onDone={handleDone}
          onChipsChange={handleChipsChange}
        />
      )}
    </div>
  );
}
