'use client';

import type { Audit } from '@/lib/types';

type SummaryRow = {
  name: string;
  entradas: number;
  salidas: number;
  stockInicial: number;
  stockFinal: number;
  minStock: number;
  faltaPedir: number;
};

function buildRows(summary: SummaryRow[]) {
  return summary.map((s) => ({
    Producto: s.name,
    'Stock inicial': s.stockInicial,
    Entradas: s.entradas,
    Salidas: s.salidas,
    'Stock final': s.stockFinal,
    Mínimo: s.minStock,
    'Falta pedir': s.faltaPedir,
  }));
}

export function AuditExport({ audit, summary }: { audit: Audit; summary: SummaryRow[] }) {
  const filenameBase = `auditoria-${new Date(audit.started_at).toISOString().slice(0, 10)}`;

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(buildRows(summary));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
    XLSX.writeFile(wb, `${filenameBase}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Auditoría de stock', 14, 16);
    doc.setFontSize(10);
    doc.text(`Inicio: ${new Date(audit.started_at).toLocaleString('es-AR')}`, 14, 24);
    doc.text(
      `Cierre: ${audit.ended_at ? new Date(audit.ended_at).toLocaleString('es-AR') : 'En curso'}`,
      14,
      30
    );
    if (audit.note) doc.text(`Nota: ${audit.note}`, 14, 36);
    autoTable(doc, {
      startY: audit.note ? 42 : 36,
      head: [['Producto', 'Stock inicial', 'Entradas', 'Salidas', 'Stock final', 'Mínimo', 'Falta pedir']],
      body: summary.map((s) => [
        s.name,
        String(s.stockInicial),
        s.entradas > 0 ? `+${s.entradas}` : '—',
        s.salidas > 0 ? `-${s.salidas}` : '—',
        String(s.stockFinal),
        String(s.minStock),
        s.faltaPedir > 0 ? String(s.faltaPedir) : '—',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`${filenameBase}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        disabled={summary.length === 0}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-background disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Exportar Excel
      </button>
      <button
        onClick={exportPdf}
        disabled={summary.length === 0}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-background disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Exportar PDF
      </button>
    </div>
  );
}
