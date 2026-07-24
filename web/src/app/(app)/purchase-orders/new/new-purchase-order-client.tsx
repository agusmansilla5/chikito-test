'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Supplier, SupplierProduct } from '@/lib/types';
import { formatDate } from '@/lib/date';
import { loadDraft, saveDraft, clearDraft } from '@/lib/order-draft';
import { createSupplier } from '../../suppliers/actions';
import { createPurchaseOrder, type PurchaseOrderItemInput } from '../actions';
import { QuickAddProductModal } from './quick-add-product-modal';

type LineItem = {
  product: Product;
  quantity: string;
  unitCost: string;
};

type DraftItem = { productId: string; quantity: string; unitCost: string };

type Draft = {
  supplierId: string;
  orderDate: string;
  amount: string;
  shippingDetail: string;
  note: string;
  items: DraftItem[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewPurchaseOrderClient({
  initialSuppliers,
  supplierProducts,
  products,
  locationId,
  locationName,
}: {
  initialSuppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  products: Product[];
  locationId: string;
  locationName: string;
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [orderDate, setOrderDate] = useState(todayIso());
  const [amount, setAmount] = useState('');
  const [shippingDetail, setShippingDetail] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);

  const restoring = useRef(true);

  // Restaura un borrador sin enviar de este local, si existe. localStorage no
  // existe en el server, así que esto solo puede pasar post-montaje (no se
  // puede hacer con un initializer de useState sin romper la hidratación).
  useEffect(() => {
    const draft = loadDraft<Draft>(locationId);
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync intencional con localStorage post-montaje, ver comentario arriba
      setSupplierId(draft.supplierId);
      setOrderDate(draft.orderDate || todayIso());
      setAmount(draft.amount);
      setShippingDetail(draft.shippingDetail);
      setNote(draft.note);
      const restoredItems = draft.items
        .map((di) => {
          const product = products.find((p) => p.id === di.productId);
          return product ? { product, quantity: di.quantity, unitCost: di.unitCost } : null;
        })
        .filter((i): i is LineItem => i !== null);
      setItems(restoredItems);
      setRestoredNotice(true);
    }
    restoring.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // Guarda el borrador con debounce cada vez que cambia algo relevante.
  useEffect(() => {
    if (restoring.current) return;
    const timeout = setTimeout(() => {
      const draft: Draft = {
        supplierId,
        orderDate,
        amount,
        shippingDetail,
        note,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, unitCost: i.unitCost })),
      };
      saveDraft(locationId, draft);
    }, 800);
    return () => clearTimeout(timeout);
  }, [locationId, supplierId, orderDate, amount, shippingDetail, note, items]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const available = products.filter((p) => !items.some((i) => i.product.id === p.id));
    if (!term) return [];
    return available.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
    );
  }, [products, query, items]);

  const habitualProducts = useMemo(
    () => supplierProducts.filter((sp) => sp.supplier_id === supplierId),
    [supplierProducts, supplierId]
  );

  function addItem(p: Product, quantity = '1', unitCost?: string) {
    setItems((prev) => [
      ...prev,
      { product: p, quantity, unitCost: unitCost ?? (p.cost_price != null ? String(p.cost_price) : '') },
    ]);
    setQuery('');
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateItem(productId: string, field: 'quantity' | 'unitCost', value: string) {
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, [field]: value } : i)));
  }

  function loadHabitualOrder() {
    if (habitualProducts.length === 0) return;
    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.product.id));
      const added: LineItem[] = [];
      for (const sp of habitualProducts) {
        if (existingIds.has(sp.product_id)) continue;
        const product = products.find((p) => p.id === sp.product_id);
        if (!product) continue;
        added.push({
          product,
          quantity: sp.default_quantity != null ? String(sp.default_quantity) : '1',
          unitCost: sp.default_unit_cost != null ? String(sp.default_unit_cost) : product.cost_price != null ? String(product.cost_price) : '',
        });
      }
      return [...prev, ...added];
    });
  }

  async function handleCreateSupplier() {
    const trimmed = newSupplierName.trim();
    if (!trimmed) return;
    const result = await createSupplier({
      name: trimmed,
      phone: null,
      email: null,
      notes: null,
      fulfillment_mode: null,
      cbu_cvu: null,
      alias: null,
      bank_name: null,
      account_holder: null,
    });
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
    const result = await createPurchaseOrder(
      supplierId,
      orderDate,
      amount.trim() ? Number(amount) : null,
      shippingDetail.trim() || null,
      note.trim() || null,
      parsedItems
    );
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    clearDraft(locationId);
    router.push(`/purchase-orders/${result.id}`);
  }

  return (
    <div className="max-w-2xl">
      {restoredNotice && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          <span>Se restauró un borrador que no habías enviado.</span>
          <button
            onClick={() => {
              setItems([]);
              setSupplierId('');
              setAmount('');
              setShippingDetail('');
              setNote('');
              clearDraft(locationId);
              setRestoredNotice(false);
            }}
            className="font-medium underline"
          >
            Descartar
          </button>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-foreground">Fecha del pedido</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <p className="mt-1 text-xs text-foreground">{formatDate(`${orderDate}T00:00:00`)}</p>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-foreground">Destino / Local</label>
          <input
            type="text"
            value={locationName}
            disabled
            className="w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm text-foreground dark:border-zinc-700"
          />
        </div>
      </div>

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

      {supplierId && habitualProducts.length > 0 && (
        <button
          onClick={loadHabitualOrder}
          className="mb-4 mt-2 rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
        >
          📋 Cargar pedido habitual ({habitualProducts.length})
        </button>
      )}

      <label className="mb-1 mt-4 block text-sm font-medium text-foreground">Monto ($)</label>
      <input
        type="number"
        step="0.01"
        placeholder="Estimado o exacto"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />

      <label className="mb-1 block text-sm font-medium text-foreground">Detalle de envío / retiro</label>
      <input
        type="text"
        placeholder="Ej: Envía mañana a la mañana / Lo retiramos nosotros"
        value={shippingDetail}
        onChange={(e) => setShippingDetail(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />

      <label className="mb-1 block text-sm font-medium text-foreground">Nota (opcional)</label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />

      <label className="mb-1 block text-sm font-medium text-foreground">Agregar productos</label>
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
        />
        <button
          onClick={() => setQuickAddOpen(true)}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          + Crear producto
        </button>
      </div>
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
        {submitting ? 'Creando...' : 'Crear pedido'}
      </button>

      {quickAddOpen && (
        <QuickAddProductModal
          initialName={query}
          onClose={() => setQuickAddOpen(false)}
          onCreated={(product) => {
            addItem(product);
            setQuickAddOpen(false);
          }}
        />
      )}
    </div>
  );
}
