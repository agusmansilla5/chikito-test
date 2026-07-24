'use client';

import { useState } from 'react';
import { getPaymentReceiptUrl } from '../actions';

export function ReceiptLink({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await getPaymentReceiptUrl(path);
    setLoading(false);
    if (result.error || !result.url) {
      alert(result.error ?? 'No se pudo abrir el comprobante.');
      return;
    }
    window.open(result.url, '_blank');
  }

  return (
    <button onClick={handleClick} disabled={loading} className="text-accent hover:underline disabled:opacity-50">
      {loading ? 'Abriendo...' : 'Ver comprobante'}
    </button>
  );
}
