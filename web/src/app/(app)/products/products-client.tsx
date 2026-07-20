'use client';

import { useMemo, useState } from 'react';
import type { Product, Category } from '@/lib/types';
import { findSimilarProducts } from '@/lib/matching';
import { createProduct, updateProduct, deleteProduct, createCategory, deleteCategory } from './actions';

type FormState = {
  id: string | null;
  name: string;
  barcode: string;
  min_stock: string;
  initial_quantity: string;
  category_id: string | null;
};

type SortKey = 'name' | 'barcode' | 'quantity' | 'category';

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  barcode: '',
  min_stock: '0',
  initial_quantity: '0',
  category_id: null,
};
const SIN_RUBRO = 'Sin rubro';

function compareProducts(a: Product, b: Product, key: SortKey, dir: 'asc' | 'desc') {
  let cmp = 0;
  if (key === 'name') cmp = a.name.localeCompare(b.name);
  else if (key === 'barcode') cmp = (a.barcode ?? '').localeCompare(b.barcode ?? '');
  else if (key === 'quantity') cmp = a.quantity - b.quantity;
  return dir === 'asc' ? cmp : -cmp;
}

export function ProductsClient({
  initialProducts,
  initialCategories,
  canEdit,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
  canEdit: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const similarProducts = useMemo(() => {
    if (form.id) return [];
    return findSimilarProducts(form.name, products);
  }, [form.id, form.name, products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !term || p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'all' || (p.category_id ?? 'none') === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const groups = useMemo(() => {
    const itemSortKey: SortKey = sortKey === 'category' ? 'name' : sortKey;
    const sorted = [...filtered].sort((a, b) => compareProducts(a, b, itemSortKey, sortKey === 'category' ? 'asc' : sortDir));
    const map = new Map<string, Product[]>();
    for (const p of sorted) {
      const key = p.categories?.name ?? SIN_RUBRO;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const entries = Array.from(map.entries());
    if (sortKey === 'category') {
      entries.sort(([a], [b]) => (sortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));
    } else {
      entries.sort(([a], [b]) => (a === SIN_RUBRO ? 1 : b === SIN_RUBRO ? -1 : a.localeCompare(b)));
    }
    return entries;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      barcode: p.barcode ?? '',
      min_stock: String(p.min_stock),
      initial_quantity: '0',
      category_id: p.category_id,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Ingresá un nombre.');
      return;
    }
    setSubmitting(true);
    const input = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      min_stock: Number(form.min_stock) || 0,
      category_id: form.category_id,
    };
    const result = form.id
      ? await updateProduct(form.id, input)
      : await createProduct(input, Number(form.initial_quantity) || 0);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setModalOpen(false);
    window.location.reload();
  }

  async function handleDelete(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    const result = await deleteProduct(p.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const result = await createCategory(trimmed);
    if (result.error || !result.category) {
      setError(result.error);
      return;
    }
    setCategories((prev) => [...prev, result.category].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, category_id: result.category.id }));
    setNewCategoryName('');
  }

  async function handleDeleteCategory(c: Category) {
    if (!confirm(`¿Eliminar el rubro "${c.name}"? Los productos quedarán sin rubro.`)) return;
    const result = await deleteCategory(c.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
    setProducts((prev) =>
      prev.map((p) => (p.category_id === c.id ? { ...p, category_id: null, categories: null } : p))
    );
    if (categoryFilter === c.id) setCategoryFilter('all');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Todos los rubros</option>
          <option value="none">{SIN_RUBRO}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={openCreate}
            className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nuevo producto
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-zinc-500 dark:text-zinc-400">
            <tr>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => toggleSort('name')}
              >
                Producto{sortArrow('name')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => toggleSort('barcode')}
              >
                Código{sortArrow('barcode')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => toggleSort('category')}
              >
                Rubro{sortArrow('category')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => toggleSort('quantity')}
              >
                Stock{sortArrow('quantity')}
              </th>
              <th className="px-4 py-2 font-medium">Mínimo</th>
              {canEdit && <th className="px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          {filtered.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-zinc-400">
                  No se encontraron productos.
                </td>
              </tr>
            </tbody>
          )}
          {groups.map(([categoryName, items]) => (
            <tbody key={categoryName}>
              <tr className="bg-background">
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  {categoryName}
                </td>
              </tr>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">{p.name}</td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{p.barcode ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{p.categories?.name ?? SIN_RUBRO}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${p.quantity < p.min_stock ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {p.quantity}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{p.min_stock}</td>
                  {canEdit && (
                    <td className="px-4 py-2">
                      <button onClick={() => openEdit(p)} className="mr-3 text-blue-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {categories.length > 0 && canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Rubros:</span>
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-1 rounded-full bg-background px-2 py-1">
              {c.name}
              <button onClick={() => handleDeleteCategory(c)} className="text-zinc-400 hover:text-red-600">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {form.id ? 'Editar producto' : 'Nuevo producto'}
            </h2>

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mb-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            {similarProducts.length > 0 && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                <p className="mb-1 px-1 text-xs font-medium text-amber-800">
                  ¿Ya existe? Este producto ya está cargado, no crees uno nuevo:
                </p>
                {similarProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setModalOpen(false)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-amber-100"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{p.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Stock: {p.quantity}</span>
                  </button>
                ))}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Código de barras (opcional)</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              className="mb-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            {!form.id && (
              <>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cantidad inicial</label>
                <input
                  type="number"
                  value={form.initial_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, initial_quantity: e.target.value }))}
                  className="mb-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="mb-3 text-xs text-zinc-400">
                  Si ponés una cantidad, queda registrada como movimiento (y se suma a la auditoría en curso, si hay
                  una abierta).
                </p>
              </>
            )}

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stock mínimo</label>
            <input
              type="number"
              value={form.min_stock}
              onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
              className="mb-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Rubro</label>
            <select
              value={form.category_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
              className="mb-2 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">{SIN_RUBRO}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Nuevo rubro (ej: Con alcohol)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleCreateCategory}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                + Crear
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-background dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
