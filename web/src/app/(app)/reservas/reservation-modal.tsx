'use client';

import { useState } from 'react';
import { VENUE_OPTIONS, type Reservation, type ReservationChipOption, type ReservationVenue } from '@/lib/types';
import { ChipManager } from './chip-manager';
import { createReservation, updateReservation, type ReservationInput } from './actions';
import type { ParsedReservationDraft } from './parse-actions';

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700';
const labelClass = 'mb-1 block text-sm font-medium text-foreground';

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Empareja las etiquetas sugeridas por la IA con los chips ya existentes
// (match exacto primero, si no por inclusión) — si no hay coincidencia, el
// admin las agrega a mano desde el ChipManager.
function findChipIdByLabel(chips: ReservationChipOption[], label: string | null): string | null {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  const exact = chips.find((c) => c.label.trim().toLowerCase() === normalized);
  if (exact) return exact.id;
  const partial = chips.find(
    (c) => c.label.trim().toLowerCase().includes(normalized) || normalized.includes(c.label.trim().toLowerCase())
  );
  return partial?.id ?? null;
}

export function ReservationModal({
  reservation,
  draft,
  promoChips,
  tagChips,
  defaultVenue,
  onClose,
  onDone,
  onChipsChange,
}: {
  reservation: Reservation | null;
  draft?: ParsedReservationDraft | null;
  promoChips: ReservationChipOption[];
  tagChips: ReservationChipOption[];
  defaultVenue: ReservationVenue;
  onClose: () => void;
  onDone: () => void;
  onChipsChange: (kind: 'promo' | 'tag', chips: ReservationChipOption[]) => void;
}) {
  const isEdit = !!reservation;
  const [venue, setVenue] = useState<ReservationVenue>(reservation?.venue ?? draft?.venue ?? defaultVenue);
  const [eventAt, setEventAt] = useState(() => {
    if (reservation) return toLocalDateTimeInput(reservation.event_at);
    if (draft?.eventAtIso) {
      const fromDraft = toLocalDateTimeInput(draft.eventAtIso);
      if (fromDraft) return fromDraft;
    }
    return toLocalDateTimeInput(new Date().toISOString());
  });
  const [customerName, setCustomerName] = useState(reservation?.customer_name ?? draft?.customerName ?? '');
  const [customerAge, setCustomerAge] = useState(
    reservation?.customer_age != null
      ? String(reservation.customer_age)
      : draft?.customerAge != null
        ? String(draft.customerAge)
        : ''
  );
  const [customerPhone, setCustomerPhone] = useState(reservation?.customer_phone ?? draft?.customerPhone ?? '');
  const [promoChipId, setPromoChipId] = useState<string | null>(
    reservation?.promo_chip_id ?? (draft ? findChipIdByLabel(promoChips, draft.promoLabelGuess) : null)
  );
  const [promoDetail, setPromoDetail] = useState(reservation?.promo_detail ?? draft?.promoDetail ?? '');
  const [isGift, setIsGift] = useState(reservation?.is_gift ?? draft?.isGift ?? false);
  const [totalAmount, setTotalAmount] = useState(
    reservation ? String(reservation.total_amount) : draft?.totalAmount != null ? String(draft.totalAmount) : ''
  );
  const [depositAmount, setDepositAmount] = useState(
    reservation ? String(reservation.deposit_amount) : draft?.depositAmount != null ? String(draft.depositAmount) : '0'
  );
  const [depositDetail, setDepositDetail] = useState(reservation?.deposit_detail ?? draft?.depositDetail ?? '');
  const [tagChipIds, setTagChipIds] = useState<string[]>(() => {
    if (reservation) return reservation.reservation_tag_links?.map((l) => l.reservation_chip_options.id) ?? [];
    if (draft) {
      const matched = draft.tagLabelGuesses
        .map((label) => findChipIdByLabel(tagChips, label))
        .filter((id): id is string => id !== null);
      return [...new Set(matched)];
    }
    return [];
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(id: string) {
    setTagChipIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSubmit() {
    if (!customerName.trim()) {
      setError('Ingresá nombre y apellido.');
      return;
    }
    if (!eventAt) {
      setError('Ingresá la fecha y hora de la reserva.');
      return;
    }
    const total = Number(totalAmount) || 0;
    const deposit = Number(depositAmount) || 0;

    setError(null);
    setSubmitting(true);

    const input: ReservationInput = {
      venue,
      eventAt: new Date(eventAt).toISOString(),
      customerName: customerName.trim(),
      customerAge: customerAge.trim() ? Number(customerAge) : null,
      customerPhone: customerPhone.trim() || null,
      promoChipId,
      promoDetail: promoDetail.trim() || null,
      isGift,
      totalAmount: total,
      depositAmount: deposit,
      depositDetail: depositDetail.trim() || null,
      tagChipIds,
    };

    const result = isEdit ? await updateReservation(reservation!.id, input) : await createReservation(input);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-foreground">{isEdit ? 'Editar reserva' : 'Nueva reserva'}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-xl leading-none text-foreground hover:text-red-600">
            ×
          </button>
        </div>

        {draft && !isEdit && (
          <div className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            Datos completados por IA a partir de lo que pegaste — revisá y corregí antes de guardar.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Sede</label>
            <select value={venue} onChange={(e) => setVenue(e.target.value as ReservationVenue)} className={inputClass}>
              {VENUE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha y hora de la reserva</label>
            <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Nombre y apellido</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Edad</label>
            <input
              type="number"
              value={customerAge}
              onChange={(e) => setCustomerAge(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Teléfono</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+549..."
                className={inputClass}
              />
              {customerPhone.trim() && (
                <a
                  href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Promo elegida</label>
          <ChipManager
            kind="promo"
            chips={promoChips}
            mode="single"
            selectedId={promoChipId}
            onSelectSingle={setPromoChipId}
            onChipsChange={(chips) => onChipsChange('promo', chips)}
            onDeleted={(id) => setPromoChipId((p) => (p === id ? null : p))}
          />
        </div>

        <div className="mt-3">
          <label className={labelClass}>Detalle de la promo elegida</label>
          <textarea
            value={promoDetail}
            onChange={(e) => setPromoDetail(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>¿Se regala?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsGift(true)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isGift ? 'bg-accent text-accent-foreground' : 'border border-zinc-300 text-foreground dark:border-zinc-700'
                }`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setIsGift(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  !isGift ? 'bg-accent text-accent-foreground' : 'border border-zinc-300 text-foreground dark:border-zinc-700'
                }`}
              >
                No
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Monto total</label>
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Seña</label>
            <input
              type="number"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className={labelClass}>Detalle de la seña</label>
          <textarea
            value={depositDetail}
            onChange={(e) => setDepositDetail(e.target.value)}
            placeholder="Ej: paga el saldo en el local / abona el saldo antes por transferencia"
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="mt-4">
          <label className={labelClass}>Chips / etiquetas personalizadas</label>
          <ChipManager
            kind="tag"
            chips={tagChips}
            mode="multiple"
            selectedIds={tagChipIds}
            onToggleMultiple={toggleTag}
            onChipsChange={(chips) => onChipsChange('tag', chips)}
            onDeleted={(id) => setTagChipIds((ids) => ids.filter((x) => x !== id))}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}
