'use client';

import { useState } from 'react';
import { receivePurchaseOrder } from '../actions';

type ReceiveItem = { id: string; name: string; quantity: number };

export function ReceiveModal({
  orderId,
  items,
  onClose,
  onDone,
}: {
  orderId: string;
  items: ReceiveItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [received, setReceived] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, String(i.quantity)]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const receivedItems = items.map((i) => ({
      item_id: i.id,
      received_quantity: Math.max(0, Number(received[i.id]) || 0),
    }));
    const result = await receivePurchaseOrder(orderId, receivedItems);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-foreground">Confirmar recepción</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-xl leading-none text-foreground hover:text-red-600">
            ×
          </button>
        </div>

        <p className="mb-3 text-sm text-foreground">
          Revisá la cantidad realmente recibida de cada producto. Si algo llegó incompleto o dañado, ajustá el número
          antes de confirmar — eso es lo que va a sumarse al stock.
        </p>

        <div className="mb-4 space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">
                {i.name} <span className="text-xs">(pedido: {i.quantity})</span>
              </span>
              <input
                type="number"
                value={received[i.id]}
                onChange={(e) => setReceived((prev) => ({ ...prev, [i.id]: e.target.value }))}
                className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
              />
            </div>
          ))}
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  );
}
