'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAudit } from './actions';

export function DeleteAuditButton({ auditId }: { auditId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        '¿Eliminar esta auditoría del historial? Los movimientos ya registrados no se borran, solo dejan de estar asociados a esta auditoría.'
      )
    )
      return;
    setSubmitting(true);
    const result = await deleteAudit(auditId);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={submitting}
      className="text-red-600 hover:underline disabled:opacity-50"
    >
      {submitting ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}
