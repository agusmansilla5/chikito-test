'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Supplier } from '@/lib/types';
import { cancelPurchaseOrder, deletePurchaseOrder } from '../actions';
import { ReceiveModal } from './receive-modal';
import { PaymentModal } from './payment-modal';

export function ReceiveButton({ orderId, items }: { orderId: string; items: { id: string; name: string; quantity: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Marcar como recibido
      </button>
      {open && (
        <ReceiveModal
          orderId={orderId}
          items={items}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export function PayButton({
  orderId,
  supplier,
  remaining,
}: {
  orderId: string;
  supplier: Pick<Supplier, 'name' | 'cbu_cvu' | 'alias' | 'bank_name' | 'account_holder'> | null;
  remaining: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-accent/40 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
      >
        Registrar pago
      </button>
      {open && (
        <PaymentModal
          orderId={orderId}
          supplier={supplier}
          remaining={remaining}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleCancel() {
    if (!confirm('¿Cancelar este pedido?')) return;
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
      {submitting ? 'Cancelando...' : 'Cancelar pedido'}
    </button>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
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
