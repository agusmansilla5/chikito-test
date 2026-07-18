'use client';

import { useState } from 'react';
import { updateAuditNote } from './actions';

export function NoteEditor({ auditId, initialNote }: { auditId: string; initialNote: string | null }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const result = await updateAuditNote(auditId, note.trim() || null);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setEditing(false);
    window.location.reload();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-1 text-left text-sm italic text-zinc-500 hover:text-blue-600 hover:underline"
      >
        {initialNote ? initialNote : '+ Agregar nota'}
      </button>
    );
  }

  return (
    <div className="mt-2 max-w-md">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Nota sobre esta auditoría..."
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            setNote(initialNote ?? '');
            setEditing(false);
          }}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </div>
  );
}
