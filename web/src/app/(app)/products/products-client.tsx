'use client';

import { useMemo, useState } from 'react';
import type { Product, Category, Area } from '@/lib/types';
import { findSimilarProducts } from '@/lib/matching';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  deleteCategory,
  createArea,
  deleteArea,
} from './actions';
import { CountTemplateExport } from './count-template-export';

type FormState = {
  id: string | null;
  name: string;
  barcode: string;
  min_stock: string;
  initial_quantity: string;
  category_id: string | null;
  area_id: string | null;
  cost_price: string;
  sale_price: string;
};

function marginPct(cost: number | null, sale: number | null) {
  if (!cost || !sale || sale <= 0) return null;
  return Math.round(((sale - cost) / sale) * 100);
}

type SortKey = 'name' | 'barcode' | 'quantity' | 'category';

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  barcode: '',
  min_stock: '0',
  initial_quantity: '0',
  category_id: null,
  area_id: null,
  cost_price: '',
  sale_price: '',
};
const SIN_RUBRO = 'Sin rubro';
const SIN_AREA = 'Sin área';
const PAGE_SIZE = 30;

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
  initialAreas,
  canEdit,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
  initialAreas: Area[];
  canEdit: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [areas, setAreas] = useState(initialAreas);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
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
      const matchesArea = areaFilter === 'all' || (p.area_id ?? 'none') === areaFilter;
      return matchesSearch && matchesCategory && matchesArea;
    });
  }, [products, search, categoryFilter, areaFilter]);

  const allGroups = useMemo(() => {
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

  const flatSorted = useMemo(() => allGroups.flatMap(([, items]) => items), [allGroups]);
  const totalPages = Math.max(1, Math.ceil(flatSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = useMemo(
    () => flatSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [flatSorted, currentPage]
  );
  const groups = useMemo(() => {
    const result: [string, Product[]][] = [];
    for (const p of pageSlice) {
      const key = p.categories?.name ?? SIN_RUBRO;
      const last = result[result.length - 1];
      if (last && last[0] === key) last[1].push(p);
      else result.push([key, [p]]);
    }
    return result;
  }, [pageSlice]);

  function toggleSort(key: SortKey) {
    setPage(1);
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
      area_id: p.area_id,
      cost_price: p.cost_price != null ? String(p.cost_price) : '',
      sale_price: p.sale_price != null ? String(p.sale_price) : '',
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
      area_id: form.area_id,
      cost_price: form.cost_price.trim() ? Number(form.cost_price) : null,
      sale_price: form.sale_price.trim() ? Number(form.sale_price) : null,
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

  async function handleCreateArea() {
    const trimmed = newAreaName.trim();
    if (!trimmed) return;
    const result = await createArea(trimmed);
    if (result.error || !result.area) {
      setError(result.error);
      return;
    }
    setAreas((prev) => [...prev, result.area].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, area_id: result.area.id }));
    setNewAreaName('');
  }

  async function handleDeleteArea(a: Area) {
    if (!confirm(`¿Eliminar el área "${a.name}"? Los productos quedarán sin área.`)) return;
    const result = await deleteArea(a.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setAreas((prev) => prev.filter((x) => x.id !== a.id));
    setProducts((prev) => prev.map((p) => (p.area_id === a.id ? { ...p, area_id: null, areas: null } : p)));
    if (areaFilter === a.id) setAreaFilter('all');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="all">Todos los rubros</option>
          <option value="none">{SIN_RUBRO}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={areaFilter}
          onChange={(e) => {
            setAreaFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="all">Todas las áreas</option>
          <option value="none">{SIN_AREA}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <CountTemplateExport products={filtered} />
          {canEdit && (
            <button
              onClick={openCreate}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-foreground"
                onClick={() => toggleSort('name')}
              >
                Producto{sortArrow('name')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-foreground"
                onClick={() => toggleSort('barcode')}
              >
                Código{sortArrow('barcode')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-foreground"
                onClick={() => toggleSort('category')}
              >
                Rubro{sortArrow('category')}
              </th>
              <th className="px-4 py-2 font-medium">Área</th>
              <th
                className="cursor-pointer select-none px-4 py-2 font-medium hover:text-foreground"
                onClick={() => toggleSort('quantity')}
              >
                Stock{sortArrow('quantity')}
              </th>
              <th className="px-4 py-2 font-medium">Mínimo</th>
              <th className="px-4 py-2 font-medium">Margen</th>
              {canEdit && <th className="px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          {filtered.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="px-4 py-6 text-center text-foreground">
                  No se encontraron productos.
                </td>
              </tr>
            </tbody>
          )}
          {groups.map(([categoryName, items]) => (
            <tbody key={categoryName}>
              <tr className="bg-background">
                <td
                  colSpan={canEdit ? 8 : 7}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground"
                >
                  {categoryName}
                </td>
              </tr>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-2 text-foreground">{p.barcode ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{p.categories?.name ?? SIN_RUBRO}</td>
                  <td className="px-4 py-2 text-foreground">{p.areas?.name ?? SIN_AREA}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${p.quantity < p.min_stock ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {p.quantity}
                  </td>
                  <td className="px-4 py-2 text-foreground">{p.min_stock}</td>
                  <td className="px-4 py-2 text-foreground">
                    {marginPct(p.cost_price, p.sale_price) != null ? `${marginPct(p.cost_price, p.sale_price)}%` : '—'}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2">
                      <button onClick={() => openEdit(p)} className="mr-3 text-accent hover:underline">
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-foreground">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-background disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-700"
          >
            ‹ Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages} ({flatSorted.length} productos)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-background disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-700"
          >
            Siguiente ›
          </button>
        </div>
      )}

      {categories.length > 0 && canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground">
          <span>Rubros:</span>
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-1 rounded-full bg-background px-2 py-1">
              {c.name}
              <button onClick={() => handleDeleteCategory(c)} className="text-foreground hover:text-red-600">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {areas.length > 0 && canEdit && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground">
          <span>Áreas:</span>
          {areas.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full bg-background px-2 py-1">
              {a.name}
              <button onClick={() => handleDeleteArea(a)} className="text-foreground hover:text-red-600">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {form.id ? 'Editar producto' : 'Nuevo producto'}
            </h2>

            <label className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mb-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
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
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-foreground">Stock: {p.quantity}</span>
                  </button>
                ))}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-foreground">Código de barras (opcional)</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              className="mb-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />

            {!form.id && (
              <>
                <label className="mb-1 block text-sm font-medium text-foreground">Cantidad inicial</label>
                <input
                  type="number"
                  value={form.initial_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, initial_quantity: e.target.value }))}
                  className="mb-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <p className="mb-3 text-xs text-foreground">
                  Si ponés una cantidad, queda registrada como movimiento (y se suma a la auditoría en curso, si hay
                  una abierta).
                </p>
              </>
            )}

            <label className="mb-1 block text-sm font-medium text-foreground">Stock mínimo</label>
            <input
              type="number"
              value={form.min_stock}
              onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
              className="mb-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />

            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-foreground">Costo (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-foreground">Precio de venta (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.sale_price}
                  onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <label className="mb-1 block text-sm font-medium text-foreground">Rubro</label>
            <select
              value={form.category_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
              className="mb-2 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
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
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleCreateCategory}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                + Crear
              </button>
            </div>

            <label className="mb-1 block text-sm font-medium text-foreground">
              Área (cocina, barra, limpieza, depósito...)
            </label>
            <select
              value={form.area_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value || null }))}
              className="mb-2 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">{SIN_AREA}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Nueva área (ej: Barra 1)"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleCreateArea}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                + Crear
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
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
