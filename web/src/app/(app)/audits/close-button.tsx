'use client';

import { useState } from 'react';
import { closeAudit } from './actions';

export function CloseAuditButton({ auditId }: { auditId: string }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleClose() {
    if (!confirm('¿Confirmás que se terminó de cargar el conteo de esta auditoría?')) return;
    setSubmitting(true);
    const result = await closeAudit(auditId);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <button
      onClick={handleClose}
      disabled={submitting}
      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
    >
      {submitting ? 'Cerrando...' : 'Cerrar auditoría'}
    </button>
  );
}
