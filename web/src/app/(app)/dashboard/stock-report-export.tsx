'use client';

import type { Product } from '@/lib/types';

function rowsFor(products: Product[]) {
  return products.map((p) => ({
    Producto: p.name,
    Rubro: p.categories?.name ?? 'Sin rubro',
    'Stock actual': p.quantity,
    Mínimo: p.min_stock,
    'Falta pedir': Math.max(0, p.min_stock - p.quantity),
  }));
}

export function StockReportExport({ products }: { products: Product[] }) {
  async function exportExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rowsFor(products));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `stock-actual-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Informe de stock actual', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [['Producto', 'Rubro', 'Stock actual', 'Mínimo', 'Falta pedir']],
      body: rowsFor(products).map((r) => [
        r.Producto,
        r.Rubro,
        String(r['Stock actual']),
        String(r.Mínimo),
        String(r['Falta pedir']),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4 && Number(data.cell.raw) > 0) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    doc.save(`stock-actual-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        disabled={products.length === 0}
        className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        Exportar Excel
      </button>
      <button
        onClick={exportPdf}
        disabled={products.length === 0}
        className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        Exportar PDF
      </button>
    </div>
  );
}
