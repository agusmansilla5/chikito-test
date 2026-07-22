'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Product, Category, Area, MovementType, Unit } from '@/lib/types';
import { UNIT_OPTIONS } from '@/lib/types';
import { findSimilarProducts } from '@/lib/matching';
import { createProduct, createCategory, createArea } from '../products/actions';
import { registerMovement } from './actions';
import { BarcodeScannerModal } from './barcode-scanner-modal';

const SIN_RUBRO = 'Sin rubro';
const SIN_AREA = 'Sin área';
const looksLikeBarcode = (text: string) => /^\d{6,}$/.test(text.trim());

export function MovementClient({
  initialProducts,
  initialCategories,
  initialAreas,
  openAuditNote,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
  initialAreas: Area[];
  openAuditNote: string | null | undefined;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [areas, setAreas] = useState(initialAreas);
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [type, setType] = useState<MovementType>('entrada');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('u');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newMinStock, setNewMinStock] = useState('0');
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAreaId, setNewAreaId] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');

  const similarProducts = useMemo(
    () => (creating ? findSimilarProducts(newName, products) : []),
    [creating, newName, products]
  );

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
    );
  }, [products, query]);

  function selectProduct(p: Product) {
    setSelectedProduct(p);
    setCreating(false);
    setError(null);
  }

  function openCreateForm() {
    const trimmed = query.trim();
    setNewName(looksLikeBarcode(trimmed) ? '' : trimmed);
    setNewBarcode(looksLikeBarcode(trimmed) ? trimmed : '');
    setNewMinStock('0');
    setNewCategoryId(null);
    setNewAreaId(null);
    setSelectedProduct(null);
    setCreating(true);
    setError(null);
  }

  const handleScan = useCallback(
    (code: string) => {
      setScannerOpen(false);
      setQuery(code);
      const match = products.find((p) => p.barcode === code);
      if (match) {
        selectProduct(match);
      } else {
        setNewName('');
        setNewBarcode(code);
        setNewMinStock('0');
        setNewCategoryId(null);
        setNewAreaId(null);
        setSelectedProduct(null);
        setCreating(true);
      }
    },
    [products]
  );

  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const result = await createCategory(trimmed);
    if (result.error || !result.category) {
      setError(result.error);
      return;
    }
    setCategories((prev) => [...prev, result.category].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategoryId(result.category.id);
    setNewCategoryName('');
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
    setNewAreaId(result.area.id);
    setNewAreaName('');
  }

  async function handleCreateProduct() {
    setError(null);
    if (!newName.trim()) {
      setError('Ingresá un nombre para el producto nuevo.');
      return;
    }
    setSubmitting(true);
    const result = await createProduct(
      {
        name: newName.trim(),
        barcode: newBarcode.trim() || null,
        min_stock: Number(newMinStock) || 0,
        category_id: newCategoryId,
        area_id: newAreaId,
        cost_price: null,
        sale_price: null,
      },
      0
    );
    setSubmitting(false);
    if (result.error || !result.product) {
      setError(result.error ?? 'No se pudo crear el producto.');
      return;
    }
    const created = result.product as Product;
    setProducts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCreating(false);
    setQuery('');
    selectProduct(created);
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedProduct) {
      setError('Elegí un producto.');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Ingresá una cantidad válida.');
      return;
    }
    setSubmitting(true);
    const result = await registerMovement(selectedProduct.id, type, qty, note.trim() || null, unit);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSelectedProduct(null);
    setQuantity('');
    setNote('');
    setQuery('');
    setType('entrada');
    setUnit('u');
  }

  return (
    <div>
      {openAuditNote !== undefined && (
        <div className="mb-4 rounded-md border border-accent/30 bg-accent/10 p-3 text-sm font-medium text-accent">
          📋 Auditoría en curso{openAuditNote ? `: ${openAuditNote}` : ''} — este movimiento va a quedar registrado
          en ella.
        </div>
      )}

      <label className="mb-1 block text-sm font-medium text-foreground">Buscar producto (nombre o código de barras)</label>
      <div className="mb-1 flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
          placeholder="Escribí o escaneá..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedProduct(null);
            setCreating(false);
          }}
        />
        <button
          onClick={() => setScannerOpen(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          📷 Escanear
        </button>
      </div>

      <BarcodeScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />

      {!creating && (
        <div className="mb-2 mt-3">
          <div className="flex flex-wrap gap-2">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  selectedProduct?.id === p.id
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-background dark:hover:bg-zinc-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <p className="mt-2 text-xs text-foreground">No se encontró ningún producto con &quot;{query}&quot;.</p>
          )}
          <button onClick={openCreateForm} className="mt-2 text-sm font-medium text-accent hover:underline">
            + Crear producto nuevo
          </button>
        </div>
      )}

      {creating && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-background dark:border-zinc-800 p-4">
          <h3 className="mb-3 font-semibold text-foreground">Producto nuevo</h3>

          <label className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
          <input
            type="text"
            className="mb-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            placeholder="Ej: Gatorade 500ml"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          {similarProducts.length > 0 && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2">
              <p className="mb-1 px-1 text-xs font-medium text-amber-800">
                ¿Ya existe? Tocá para usarlo en vez de crear uno nuevo:
              </p>
              {similarProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-amber-100"
                >
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-foreground">Stock: {p.quantity}</span>
                </button>
              ))}
            </div>
          )}

          <label className="mb-1 block text-sm font-medium text-foreground">Código de barras (opcional)</label>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              placeholder="Dejalo vacío si no tiene"
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value)}
            />
            <button
              onClick={() => setScannerOpen(true)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              📷
            </button>
          </div>

          <label className="mb-1 block text-sm font-medium text-foreground">Stock mínimo (para alertas)</label>
          <input
            type="number"
            className="mb-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            value={newMinStock}
            onChange={(e) => setNewMinStock(e.target.value)}
          />

          <label className="mb-1 block text-sm font-medium text-foreground">Rubro (opcional)</label>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              onClick={() => setNewCategoryId(null)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                newCategoryId === null
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-background dark:hover:bg-zinc-800'
              }`}
            >
              {SIN_RUBRO}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setNewCategoryId(c.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  newCategoryId === c.id
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-background dark:hover:bg-zinc-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
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

          <label className="mb-1 block text-sm font-medium text-foreground">Área (opcional)</label>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              onClick={() => setNewAreaId(null)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                newAreaId === null
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-background dark:hover:bg-zinc-800'
              }`}
            >
              {SIN_AREA}
            </button>
            {areas.map((a) => (
              <button
                key={a.id}
                onClick={() => setNewAreaId(a.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  newAreaId === a.id
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-background dark:hover:bg-zinc-800'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
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

          <div className="flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateProduct}
              disabled={submitting}
              className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear y usar este producto'}
            </button>
          </div>
        </div>
      )}

      {selectedProduct && !creating && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-surface p-4 shadow-sm dark:border-zinc-800">
          <p className="mb-3 font-semibold text-accent">Producto seleccionado: {selectedProduct.name}</p>

          <label className="mb-1 block text-sm font-medium text-foreground">Tipo de movimiento</label>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setType('entrada')}
              className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                type === 'entrada' ? 'border-green-600 bg-green-600 text-white' : 'border-zinc-300 dark:border-zinc-700 text-foreground'
              }`}
            >
              Entrada
            </button>
            <button
              onClick={() => setType('salida')}
              className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                type === 'salida' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-300 dark:border-zinc-700 text-foreground'
              }`}
            >
              Salida
            </button>
          </div>

          <label className="mb-1 block text-sm font-medium text-foreground">Cantidad</label>
          <div className="mb-3 flex gap-2">
            <input
              type="number"
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <label className="mb-1 block text-sm font-medium text-foreground">Nota (opcional)</label>
          <input
            type="text"
            className="mb-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      {error && !selectedProduct && !creating && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
