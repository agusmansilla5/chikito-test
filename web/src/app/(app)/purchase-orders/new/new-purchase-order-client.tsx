'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Supplier } from '@/lib/types';
import { createSupplier } from '../../suppliers/actions';
import { createPurchaseOrder, type PurchaseOrderItemInput } from '../actions';

type LineItem = {
  product: Product;
  quantity: string;
  unitCost: string;
};

export function NewPurchaseOrderClient({
  initialSuppliers,
  products,
}: {
  initialSuppliers: Supplier[];
  products: Product[];
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const available = products.filter((p) => !items.some((i) => i.product.id === p.id));
    if (!term) return available;
    return available.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
    );
  }, [products, query, items]);

  function addItem(p: Product) {
    setItems((prev) => [...prev, { product: p, quantity: '1', unitCost: p.cost_price != null ? String(p.cost_price) : '' }]);
    setQuery('');
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateItem(productId: string, field: 'quantity' | 'unitCost', value: string) {
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, [field]: value } : i)));
  }

  async function handleCreateSupplier() {
    const trimmed = newSupplierName.trim();
    if (!trimmed) return;
    const result = await createSupplier(trimmed, null, null, null);
    if (result.error || !result.supplier) {
      setError(result.error);
      return;
    }
    setSuppliers((prev) => [...prev, result.supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setSupplierId(result.supplier.id);
    setNewSupplierName('');
    setCreatingSupplier(false);
  }

  async function handleSubmit() {
    setError(null);
    if (!supplierId) {
      setError('Elegí un proveedor.');
      return;
    }
    if (items.length === 0) {
      setError('Agregá al menos un producto.');
      return;
    }
    const parsedItems: PurchaseOrderItemInput[] = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0) {
        setError(`Ingresá una cantidad válida para "${item.product.name}".`);
        return;
      }
      parsedItems.push({
        product_id: item.product.id,
        quantity,
        unit_cost: item.unitCost.trim() ? Number(item.unitCost) : null,
      });
    }

    setSubmitting(true);
    const result = await createPurchaseOrder(supplierId, note.trim() || null, parsedItems);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/purchase-orders/${result.id}`);
  }

  return (
    <div className="max-w-2xl">
      <label className="mb-1 block text-sm font-medium text-foreground">Proveedor</label>
      {!creatingSupplier ? (
        <div className="mb-1 flex gap-2">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          >
            <option value="">Elegí un proveedor...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreatingSupplier(true)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            + Nuevo
          </button>
        </div>
      ) : (
        <div className="mb-1 flex gap-2">
          <input
            type="text"
            placeholder="Nombre del proveedor"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <button
            onClick={handleCreateSupplier}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Crear
          </button>
          <button
            onClick={() => setCreatingSupplier(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        </div>
      )}

      <label className="mb-1 mt-4 block text-sm font-medium text-foreground">Nota (opcional)</label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />

      <label className="mb-1 block text-sm font-medium text-foreground">Agregar productos</label>
      <input
        type="text"
        placeholder="Buscar por nombre o código..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />
      {query && (
        <div className="mb-3 max-h-40 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          {filteredProducts.length === 0 && (
            <p className="px-3 py-2 text-sm text-foreground">No se encontraron productos.</p>
          )}
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background dark:hover:bg-zinc-800"
            >
              <span className="text-foreground">{p.name}</span>
              <span className="text-xs text-foreground">Stock: {p.quantity}</span>
            </button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-4 py-2 font-medium">Cantidad</th>
                <th className="px-4 py-2 font-medium">Costo unitario</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium text-foreground">{item.product.name}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.product.id, 'quantity', e.target.value)}
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.product.id, 'unitCost', e.target.value)}
                      className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => removeItem(item.product.id)} className="text-red-600 hover:underline">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Creando...' : 'Crear orden de compra'}
      </button>
    </div>
  );
}
