'use client';

import { useMemo, useState } from 'react';
import type { Product, Supplier, SupplierFulfillmentMode, SupplierProduct } from '@/lib/types';
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addSupplierProduct,
  removeSupplierProduct,
  type SupplierInput,
} from './actions';

const FULFILLMENT_LABEL: Record<SupplierFulfillmentMode, string> = {
  envio: 'Envío a domicilio',
  retiro: 'Retiro por local',
};

const EMPTY_FORM: SupplierInput = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  fulfillment_mode: null,
  cbu_cvu: '',
  alias: '',
  bank_name: '',
  account_holder: '',
};

function toInput(s: Supplier): SupplierInput {
  return {
    name: s.name,
    phone: s.phone ?? '',
    email: s.email ?? '',
    notes: s.notes ?? '',
    fulfillment_mode: s.fulfillment_mode,
    cbu_cvu: s.cbu_cvu ?? '',
    alias: s.alias ?? '',
    bank_name: s.bank_name ?? '',
    account_holder: s.account_holder ?? '',
  };
}

function normalize(input: SupplierInput): SupplierInput {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    fulfillment_mode: input.fulfillment_mode || null,
    cbu_cvu: input.cbu_cvu?.trim() || null,
    alias: input.alias?.trim() || null,
    bank_name: input.bank_name?.trim() || null,
    account_holder: input.account_holder?.trim() || null,
  };
}

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700';
const labelClass = 'mb-1 block text-sm font-medium text-foreground';

function SupplierFields({
  value,
  onChange,
}: {
  value: SupplierInput;
  onChange: (next: SupplierInput) => void;
}) {
  return (
    <>
      <label className={labelClass}>Nombre / Razón social</label>
      <input
        type="text"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        className={`mb-3 ${inputClass}`}
      />

      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>Teléfono</label>
          <input
            type="text"
            value={value.phone ?? ''}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={value.email ?? ''}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <label className={labelClass}>Notas</label>
      <input
        type="text"
        value={value.notes ?? ''}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        className={`mb-3 ${inputClass}`}
      />

      <label className={labelClass}>Modalidad habitual</label>
      <select
        value={value.fulfillment_mode ?? ''}
        onChange={(e) => onChange({ ...value, fulfillment_mode: (e.target.value || null) as SupplierFulfillmentMode | null })}
        className={`mb-3 ${inputClass}`}
      >
        <option value="">Sin definir</option>
        <option value="envio">Envío a domicilio</option>
        <option value="retiro">Retiro por local</option>
      </select>

      <p className="mb-2 text-sm font-semibold text-foreground">Datos bancarios para transferencias</p>
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>CBU/CVU</label>
          <input
            type="text"
            value={value.cbu_cvu ?? ''}
            onChange={(e) => onChange({ ...value, cbu_cvu: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Alias</label>
          <input
            type="text"
            value={value.alias ?? ''}
            onChange={(e) => onChange({ ...value, alias: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>Banco</label>
          <input
            type="text"
            value={value.bank_name ?? ''}
            onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Titular</label>
          <input
            type="text"
            value={value.account_holder ?? ''}
            onChange={(e) => onChange({ ...value, account_holder: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}

function HabitualProducts({
  supplier,
  supplierProducts,
  products,
  canEdit,
  onAdd,
  onRemove,
}: {
  supplier: Supplier;
  supplierProducts: SupplierProduct[];
  products: Product[];
  canEdit: boolean;
  onAdd: (productId: string, quantity: number | null, unitCost: number | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [picked, setPicked] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const already = new Set(supplierProducts.map((sp) => sp.product_id));
    const available = products.filter((p) => !already.has(p.id));
    if (!term) return [];
    return available.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 8);
  }, [products, query, supplierProducts]);

  async function handleAdd() {
    if (!picked) return;
    setAdding(true);
    await onAdd(picked.id, quantity.trim() ? Number(quantity) : null, unitCost.trim() ? Number(unitCost) : null);
    setAdding(false);
    setPicked(null);
    setQuery('');
    setQuantity('');
    setUnitCost('');
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-foreground">Productos habituales de {supplier.name}</p>

      {supplierProducts.length === 0 && (
        <p className="mb-2 text-sm text-foreground">Todavía no hay productos habituales cargados.</p>
      )}
      {supplierProducts.length > 0 && (
        <ul className="mb-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {supplierProducts.map((sp) => (
            <li key={sp.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span className="text-foreground">
                {sp.products?.name ?? '—'}
                {sp.default_quantity != null && <span className="text-foreground"> · x{sp.default_quantity}</span>}
              </span>
              {canEdit && (
                <button onClick={() => onRemove(sp.id)} className="text-red-600 hover:underline">
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          {picked ? (
            <div className="mb-2 flex flex-wrap items-end gap-2">
              <span className="rounded-md bg-background px-2 py-2 text-sm text-foreground">{picked.name}</span>
              <input
                type="number"
                placeholder="Cantidad habitual"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Costo unitario"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700"
              />
              <button
                onClick={handleAdd}
                disabled={adding}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {adding ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                onClick={() => setPicked(null)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Buscar producto para agregar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputClass}
            />
          )}
          {!picked && query && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-foreground">No se encontraron productos.</p>}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPicked(p);
                    setQuery('');
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-background dark:hover:bg-zinc-800"
                >
                  <span className="text-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SuppliersClient({
  initialSuppliers,
  initialSupplierProducts,
  products,
  canEdit,
  isAdmin,
}: {
  initialSuppliers: Supplier[];
  initialSupplierProducts: SupplierProduct[];
  products: Product[];
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierProducts, setSupplierProducts] = useState(initialSupplierProducts);
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SupplierInput>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const editingSupplier = suppliers.find((s) => s.id === editingId) ?? null;

  async function handleCreate() {
    if (!form.name.trim()) {
      setError('Ingresá un nombre.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await createSupplier(normalize(form));
    setSubmitting(false);
    if (result.error || !result.supplier) {
      setError(result.error);
      return;
    }
    setSuppliers((prev) => [...prev, result.supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setForm(EMPTY_FORM);
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setEditForm(toInput(s));
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.name.trim()) return;
    setEditSubmitting(true);
    const normalized = normalize(editForm);
    const result = await updateSupplier(editingId, normalized);
    setEditSubmitting(false);
    if (result.error) {
      setEditError(result.error);
      return;
    }
    setSuppliers((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, ...normalized } : s)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`¿Eliminar el proveedor "${s.name}"?`)) return;
    const result = await deleteSupplier(s.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
  }

  async function handleAddSupplierProduct(productId: string, quantity: number | null, unitCost: number | null) {
    if (!editingId) return;
    const result = await addSupplierProduct(editingId, productId, quantity, unitCost);
    if (result.error || !result.supplierProduct) {
      alert(result.error);
      return;
    }
    setSupplierProducts((prev) => [...prev, result.supplierProduct]);
  }

  async function handleRemoveSupplierProduct(id: string) {
    const result = await removeSupplierProduct(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setSupplierProducts((prev) => prev.filter((sp) => sp.id !== id));
  }

  return (
    <div className="max-w-3xl">
      {canEdit && (
        <section className="mb-6 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
          <h2 className="mb-3 font-semibold text-foreground">Nuevo proveedor</h2>
          <SupplierFields value={form} onChange={setForm} />
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Agregando...' : '+ Agregar proveedor'}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Teléfono</th>
              <th className="px-4 py-2 font-medium">Modalidad</th>
              <th className="px-4 py-2 font-medium">Datos bancarios</th>
              {canEdit && <th className="px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-foreground">
                  No hay proveedores cargados.
                </td>
              </tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100 hover:bg-background dark:border-zinc-800">
                <td className="px-4 py-2 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-2 text-foreground">{s.phone ?? '—'}</td>
                <td className="px-4 py-2 text-foreground">
                  {s.fulfillment_mode ? FULFILLMENT_LABEL[s.fulfillment_mode] : '—'}
                </td>
                <td className="px-4 py-2 text-foreground">{s.alias || s.cbu_cvu || '—'}</td>
                {canEdit && (
                  <td className="px-4 py-2">
                    <button onClick={() => startEdit(s)} className="mr-3 text-accent hover:underline">
                      Editar
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSupplier && (
        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-lg font-semibold text-foreground">Editar proveedor</h2>
              <button
                onClick={() => setEditingId(null)}
                aria-label="Cerrar"
                className="text-xl leading-none text-foreground hover:text-red-600"
              >
                ×
              </button>
            </div>

            <SupplierFields value={editForm} onChange={setEditForm} />

            {editError && <p className="mb-3 text-sm text-red-600">{editError}</p>}

            <div className="mb-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSubmitting}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {editSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>

            <hr className="mb-4 border-zinc-200 dark:border-zinc-800" />

            <HabitualProducts
              supplier={editingSupplier}
              supplierProducts={supplierProducts.filter((sp) => sp.supplier_id === editingSupplier.id)}
              products={products}
              canEdit={canEdit}
              onAdd={handleAddSupplierProduct}
              onRemove={handleRemoveSupplierProduct}
            />
          </div>
        </div>
      )}
    </div>
  );
}
