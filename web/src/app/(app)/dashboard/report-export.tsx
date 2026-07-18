'use client';

import type { StockMovement } from '@/lib/types';

function rowsFor(movements: StockMovement[]) {
  return movements.map((m) => ({
    Producto: m.products?.name ?? '—',
    Tipo: m.type === 'entrada' ? 'Entrada' : 'Salida',
    Cantidad: m.quantity,
    Usuario: m.profiles?.full_name ?? '—',
    Fecha: new Date(m.created_at).toLocaleString('es-AR'),
  }));
}

export function ReportExport({ movements }: { movements: StockMovement[] }) {
  async function exportExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rowsFor(movements));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, `reporte-stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Reporte de movimientos de stock', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [['Producto', 'Tipo', 'Cantidad', 'Usuario', 'Fecha']],
      body: rowsFor(movements).map((r) => [r.Producto, r.Tipo, String(r.Cantidad), r.Usuario, r.Fecha]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`reporte-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        disabled={movements.length === 0}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        Exportar Excel
      </button>
      <button
        onClick={exportPdf}
        disabled={movements.length === 0}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        Exportar PDF
      </button>
    </div>
  );
}
