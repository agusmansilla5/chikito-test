'use client';

import type { Product } from '@/lib/types';

function rowsFor(products: Product[]) {
  return products.map((p) => ({
    Producto: p.name,
    Rubro: p.categories?.name ?? 'Sin rubro',
    Área: p.areas?.name ?? 'Sin área',
    Mínimo: p.min_stock,
    'Stock contado': '',
  }));
}

// Genera una planilla para imprimir y contar a mano (o completar en Excel):
// mismas columnas que el informe de stock, pero con "Stock contado" en blanco
// en vez de mostrar el stock actual del sistema. Respeta los filtros activos
// en la página (rubro/área/búsqueda), así que filtrando por área "Cocina" se
// puede sacar una planilla acotada solo a esos productos.
export function CountTemplateExport({ products }: { products: Product[] }) {
  async function exportExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rowsFor(products));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conteo');
    XLSX.writeFile(wb, `plantilla-conteo-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Planilla de conteo de stock', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [['Producto', 'Rubro', 'Área', 'Mínimo', 'Stock contado']],
      body: rowsFor(products).map((r) => [r.Producto, r.Rubro, r.Área, String(r.Mínimo), '']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`plantilla-conteo-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        disabled={products.length === 0}
        className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        Plantilla Excel
      </button>
      <button
        onClick={exportPdf}
        disabled={products.length === 0}
        className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        Plantilla PDF
      </button>
    </div>
  );
}
