'use client';

import { useState } from 'react';
import type { Location } from '@/lib/types';
import { startAudit } from './actions';
import { setLocation } from '../locations/actions';

export function StartAuditForm({
  locations,
  defaultLocationId,
  heading = 'Iniciar auditoría de hoy',
}: {
  locations: Location[];
  defaultLocationId: string | null;
  heading?: string;
}) {
  const [note, setNote] = useState('');
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!locationId) {
      setError('Elegí un sector.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await startAudit(note.trim() || null, locationId);
    if (result.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    // Si eligieron un sector distinto al que tenían seleccionado, cambia el
    // local activo también - así no hay que ir a buscarlo aparte después.
    if (locationId !== defaultLocationId) {
      await setLocation(locationId);
    }
    setNote('');
    window.location.reload();
  }

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 bg-surface p-4 shadow-sm dark:border-zinc-800">
      <h2 className="mb-2 font-semibold text-foreground">{heading}</h2>
      <div className="flex flex-wrap gap-2">
        {locations.length > 1 && (
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Nota (opcional, ej: conteo de bebidas)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Iniciando...' : '+ Iniciar auditoría'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
