'use client';

import { useState } from 'react';
import { startAudit } from './actions';

export function StartAuditForm() {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await startAudit(note.trim() || null);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNote('');
    window.location.reload();
  }

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 bg-surface p-4 shadow-sm dark:border-zinc-800">
      <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Iniciar auditoría de hoy</h2>
      <div className="flex gap-2">
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
