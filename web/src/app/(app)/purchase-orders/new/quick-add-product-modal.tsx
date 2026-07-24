'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { createProduct } from '../../products/actions';

export function QuickAddProductModal({
  initialName,
  onClose,
  onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Ingresá un nombre.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await createProduct(
      { name: name.trim(), barcode: null, min_stock: 0, category_id: null, area_id: null, cost_price: null, sale_price: null },
      0
    );
    setSubmitting(false);
    if (result.error || !result.product) {
      setError(result.error);
      return;
    }
    onCreated({ ...result.product, quantity: 0, min_stock: 0 } as Product);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-foreground">Crear producto nuevo</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-xl leading-none text-foreground hover:text-red-600">
            ×
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          autoFocus
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
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
            {submitting ? 'Creando...' : 'Crear y agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
