'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Category, Area } from '@/lib/types';
import { normalizeName, findSimilarProducts } from '@/lib/matching';
import { importStockCount, type ImportRow } from './actions';

type PreviewRow = {
  key: string;
  name: string;
  counted: number | null;
  minStock: number | null;
  matchedProduct: Product | null;
  resolvedCategoryId: string | null;
  resolvedCategoryName: string;
  resolvedAreaId: string | null;
  resolvedAreaName: string;
  similarWarning: string | null;
  include: boolean;
};

function findColumn(headers: string[], patterns: RegExp[]): string | undefined {
  return headers.find((h) => patterns.some((p) => p.test(h)));
}

export function ImportClient({
  products,
  categories,
  areas,
}: {
  products: Product[];
  categories: Category[];
  areas: Area[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (json.length === 0) {
        setError('El archivo no tiene filas.');
        setRows([]);
        return;
      }

      const headers = Object.keys(json[0]);
      const nameKey = findColumn(headers, [/^producto$/i, /nombre/i]);
      const categoryKey = findColumn(headers, [/rubro/i, /categor/i]);
      const areaKey = findColumn(headers, [/^área$/i, /^area$/i]);
      const minKey = findColumn(headers, [/m[ií]nimo/i]);
      const countKey = findColumn(headers, [/contad/i, /stock/i, /cantidad/i]);

      if (!nameKey || !countKey) {
        setError('No se encontraron las columnas "Producto" y "Stock contado" en el archivo.');
        setRows([]);
        return;
      }

      const preview: PreviewRow[] = [];
      json.forEach((raw, i) => {
        const name = String(raw[nameKey] ?? '').trim();
        if (!name) return;

        const rawCategory = categoryKey ? String(raw[categoryKey] ?? '').trim() : '';
        const rawArea = areaKey ? String(raw[areaKey] ?? '').trim() : '';
        const minRaw = minKey ? raw[minKey] : '';
        const minStock = minRaw !== '' && minRaw != null && !Number.isNaN(Number(minRaw)) ? Number(minRaw) : null;
        const countRaw = raw[countKey];
        const counted =
          countRaw !== '' && countRaw != null && !Number.isNaN(Number(countRaw)) ? Number(countRaw) : null;

        const normalizedName = normalizeName(name);
        const matchedProduct = products.find((p) => normalizeName(p.name) === normalizedName) ?? null;

        let resolvedCategoryId: string | null = null;
        let resolvedCategoryName = 'Sin rubro';
        let resolvedAreaId: string | null = null;
        let resolvedAreaName = 'Sin área';
        let similarWarning: string | null = null;

        if (matchedProduct) {
          resolvedCategoryId = matchedProduct.category_id;
          resolvedCategoryName = matchedProduct.categories?.name ?? 'Sin rubro';
          resolvedAreaId = matchedProduct.area_id;
          resolvedAreaName = matchedProduct.areas?.name ?? 'Sin área';
        } else {
          if (rawCategory && !/^sin rubro$/i.test(rawCategory)) {
            const match = categories.find((c) => normalizeName(c.name) === normalizeName(rawCategory));
            if (match) {
              resolvedCategoryId = match.id;
              resolvedCategoryName = match.name;
            } else {
              resolvedCategoryName = `${rawCategory} (no existe, queda sin rubro)`;
            }
          }
          if (rawArea && !/^sin área$/i.test(rawArea) && !/^sin area$/i.test(rawArea)) {
            const match = areas.find((a) => normalizeName(a.name) === normalizeName(rawArea));
            if (match) {
              resolvedAreaId = match.id;
              resolvedAreaName = match.name;
            } else {
              resolvedAreaName = `${rawArea} (no existe, queda sin área)`;
            }
          }
          const similar = findSimilarProducts(name, products);
          if (similar.length > 0) {
            similarWarning = `¿Ya existe? Se parece a "${similar[0].name}"`;
          }
        }

        const isNoOp = matchedProduct && counted != null && counted === matchedProduct.quantity;
        const include = counted != null && !isNoOp;

        preview.push({
          key: `${i}-${name}`,
          name,
          counted,
          minStock,
          matchedProduct,
          resolvedCategoryId,
          resolvedCategoryName,
          resolvedAreaId,
          resolvedAreaName,
          similarWarning,
          include,
        });
      });

      setRows(preview);
    } catch {
      setError('No se pudo leer el archivo. ¿Es un Excel (.xlsx) válido?');
      setRows([]);
    } finally {
      setParsing(false);
    }
  }

  function toggleRow(key: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, include: !r.include } : r)));
  }

  function statusLabel(row: PreviewRow) {
    if (row.counted == null) return 'Sin conteo, no se toca';
    if (row.matchedProduct) {
      if (row.counted === row.matchedProduct.quantity) return 'Sin cambios';
      return `Actualiza: ${row.matchedProduct.quantity} → ${row.counted}`;
    }
    return `Nuevo producto, stock inicial ${row.counted}`;
  }

  async function handleConfirm() {
    setError(null);
    const included = rows.filter((r) => r.include && r.counted != null);
    if (included.length === 0) {
      setError('No hay filas seleccionadas para importar.');
      return;
    }
    const payload: ImportRow[] = included.map((r) => ({
      productId: r.matchedProduct?.id ?? null,
      name: r.name,
      categoryId: r.resolvedCategoryId,
      areaId: r.resolvedAreaId,
      minStock: r.minStock,
      countedQuantity: r.counted!,
    }));

    setSubmitting(true);
    const res = await importStockCount(payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult({ created: res.created, updated: res.updated });
    setRows([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    router.refresh();
  }

  const includedCount = rows.filter((r) => r.include && r.counted != null).length;

  return (
    <div>
      <div className="mb-4 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <label className="mb-2 block text-sm font-medium text-foreground">Archivo Excel (.xlsx)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-foreground hover:file:opacity-90"
        />
        {parsing && <p className="mt-2 text-sm text-foreground">Leyendo archivo...</p>}
        {fileName && !parsing && rows.length > 0 && (
          <p className="mt-2 text-sm text-foreground">
            {fileName}: {rows.length} filas leídas, {includedCount} con cambios para aplicar.
          </p>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {result && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
          Importación aplicada: {result.created} productos nuevos, {result.updated} actualizados.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="mb-4 overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium"></th>
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 font-medium">Rubro</th>
                  <th className="px-4 py-2 font-medium">Área</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.key}
                    className={`border-t border-zinc-100 dark:border-zinc-800 ${r.counted == null ? 'opacity-40' : ''}`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        disabled={r.counted == null}
                        onChange={() => toggleRow(r.key)}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium text-foreground">
                      {r.name}
                      {r.similarWarning && <p className="text-xs font-normal text-amber-600">{r.similarWarning}</p>}
                    </td>
                    <td className="px-4 py-2 text-foreground">{r.resolvedCategoryName}</td>
                    <td className="px-4 py-2 text-foreground">{r.resolvedAreaName}</td>
                    <td className="px-4 py-2 text-foreground">{statusLabel(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting || includedCount === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Importando...' : `Confirmar importación (${includedCount})`}
          </button>
        </>
      )}
    </div>
  );
}
