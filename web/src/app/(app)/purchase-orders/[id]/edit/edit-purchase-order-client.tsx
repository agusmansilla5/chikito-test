'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, PurchaseOrder, PurchaseOrderItem, Supplier } from '@/lib/types';
import { formatPlainDate } from '@/lib/date';
import { createSupplier } from '../../../suppliers/actions';
import { updatePurchaseOrder, type PurchaseOrderEditItemInput } from '../../actions';
import { QuickAddProductModal } from '../../new/quick-add-product-modal';

type LineItem = {
  itemId: string | null;
  product: Product;
  quantity: string;
  unitCost: string;
};

function fallbackProduct(item: PurchaseOrderItem): Product {
  return {
    id: item.product_id,
    barcode: null,
    name: item.products?.name ?? 'Producto eliminado',
    quantity: 0,
    min_stock: 0,
    category_id: null,
    area_id: null,
    active: false,
    cost_price: null,
    sale_price: null,
  };
}

export function EditPurchaseOrderClient({
  order,
  items: initialItems,
  suppliers: initialSuppliers,
  products,
  locationName,
}: {
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
  suppliers: Supplier[];
  products: Product[];
  locationName: string;
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState(order.supplier_id);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [orderDate, setOrderDate] = useState(order.order_date);
  const [amount, setAmount] = useState(order.amount != null ? String(order.amount) : '');
  const [shippingDetail, setShippingDetail] = useState(order.shipping_detail ?? '');
  const [note, setNote] = useState(order.note ?? '');
  const [alias, setAlias] = useState(order.alias ?? '');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LineItem[]>(
    initialItems.map((i) => ({
      itemId: i.id,
      product: products.find((p) => p.id === i.product_id) ?? fallbackProduct(i),
      quantity: String(i.quantity),
      unitCost: i.unit_cost != null ? String(i.unit_cost) : '',
    }))
  );
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isReceived = order.status === 'recibida';

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const available = products.filter((p) => p.active && !items.some((i) => i.product.id === p.id));
    if (!term) return [];
    return available.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
    );
  }, [products, query, items]);

  function addItem(p: Product) {
    setItems((prev) => [
      ...prev,
      { itemId: null, product: p, quantity: '1', unitCost: p.cost_price != null ? String(p.cost_price) : '' },
    ]);
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
    const parsedItems: PurchaseOrderEditItemInput[] = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0) {
        setError(`Ingresá una cantidad válida para "${item.product.name}".`);
        return;
      }
      parsedItems.push({
        id: item.itemId,
        product_id: item.product.id,
        quantity,
        unit_cost: item.unitCost.trim() ? Number(item.unitCost) : null,
      });
    }

    setSubmitting(true);
    const result = await updatePurchaseOrder(order.id, {
      supplierId,
      orderDate,
      amount: amount.trim() ? Number(amount) : null,
      shippingDetail: shippingDetail.trim() || null,
      note: note.trim() || null,
      alias: alias.trim() || null,
      items: parsedItems,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/purchase-orders/${order.id}`);
  }

  return (
    <div className="max-w-2xl">
      {isReceived && (
        <div className="mb-4 rounded-md border border-yellow-400/60 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
          Este pedido ya fue recibido y el stock ya se actualizó con las cantidades originales. Editar
          cantidades/costos acá corrige el <strong>registro del pedido</strong>, pero no ajusta automáticamente el
          stock ya cargado — si cambiaste una cantidad, hacé el ajuste de stock correspondiente por separado.
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
          <p className="mt-1 text-xs text-foreground">{formatPlainDate(orderDate)}</p>
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
        <div className="mb-4 flex gap-2">
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
        <div className="mb-4 flex gap-2">
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

      <label className="mb-1 block text-sm font-medium text-foreground">Monto ($)</label>
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
        value={shippingDetail}
        onChange={(e) => setShippingDetail(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />

      <label className="mb-1 block text-sm font-medium text-foreground">Alias</label>
      <input
        type="text"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
      />

      <label className="mb-1 block text-sm font-medium text-foreground">Nota</label>
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

      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/purchase-orders/${order.id}`)}
          className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

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
