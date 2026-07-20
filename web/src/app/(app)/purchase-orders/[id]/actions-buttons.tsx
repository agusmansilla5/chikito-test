'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { receivePurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder } from '../actions';

export function ReceiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleReceive() {
    if (!confirm('¿Confirmás la recepción de esta orden? Se va a sumar el stock y actualizar el costo de los productos.')) return;
    setSubmitting(true);
    const result = await receivePurchaseOrder(id);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleReceive}
      disabled={submitting}
      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
    >
      {submitting ? 'Recibiendo...' : 'Recibir orden'}
    </button>
  );
}

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleCancel() {
    if (!confirm('¿Cancelar esta orden de compra?')) return;
    setSubmitting(true);
    const result = await cancelPurchaseOrder(id);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleCancel}
      disabled={submitting}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50 dark:border-zinc-700"
    >
      {submitting ? 'Cancelando...' : 'Cancelar orden'}
    </button>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!confirm('¿Eliminar esta orden de compra? Esta acción no se puede deshacer.')) return;
    setSubmitting(true);
    await deletePurchaseOrder(id);
    setSubmitting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={submitting}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      {submitting ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}
