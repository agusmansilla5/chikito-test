'use client';

import { VENUE_LABEL } from '@/lib/types';
import { formatDateTime } from '@/lib/date';

export type ReservationExportRow = {
  venue: keyof typeof VENUE_LABEL;
  eventAt: string;
  customerName: string;
  customerPhone: string | null;
  promoLabel: string | null;
  isGift: boolean;
  totalAmount: number;
  depositAmount: number;
  tagLabels: string[];
};

function currency(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function rowsFor(rows: ReservationExportRow[]) {
  return rows.map((r) => ({
    Sede: VENUE_LABEL[r.venue],
    'Fecha y hora': formatDateTime(r.eventAt),
    Cliente: r.customerName,
    Teléfono: r.customerPhone ?? '',
    Promo: r.promoLabel ?? '',
    '¿Se regala?': r.isGift ? 'Sí' : 'No',
    Monto: r.totalAmount,
    Seña: r.depositAmount,
    Saldo: Math.max(0, r.totalAmount - r.depositAmount),
    Etiquetas: r.tagLabels.join(', '),
  }));
}

export function ReservasExport({
  rows,
  filterLabel,
}: {
  rows: ReservationExportRow[];
  filterLabel: string;
}) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.totalAmount,
      deposit: acc.deposit + r.depositAmount,
    }),
    { total: 0, deposit: 0 }
  );
  const pending = Math.max(0, totals.total - totals.deposit);

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Gestión de Reservas', 14, 16);
    doc.setFontSize(10);
    doc.text(filterLabel, 14, 23);
    doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, 14, 29);
    autoTable(doc, {
      startY: 35,
      head: [['Sede', 'Fecha y hora', 'Cliente', 'Teléfono', 'Promo', 'Regalo', 'Monto', 'Seña', 'Saldo', 'Etiquetas']],
      body: rows.map((r) => [
        VENUE_LABEL[r.venue],
        formatDateTime(r.eventAt),
        r.customerName,
        r.customerPhone ?? '—',
        r.promoLabel ?? '—',
        r.isGift ? 'Sí' : 'No',
        currency(r.totalAmount),
        currency(r.depositAmount),
        currency(Math.max(0, r.totalAmount - r.depositAmount)),
        r.tagLabels.join(', ') || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      foot: [['', '', '', '', '', 'Totales', currency(totals.total), currency(totals.deposit), currency(pending), '']],
      footStyles: { fillColor: [244, 244, 245], textColor: [24, 24, 27], fontStyle: 'bold' },
    });
    doc.save(`reservas-${dateStamp}.pdf`);
  }

  function exportHtml() {
    const bodyRows = rowsFor(rows)
      .map(
        (r) => `<tr>
      <td>${r.Sede}</td><td>${r['Fecha y hora']}</td><td>${r.Cliente}</td><td>${r.Teléfono}</td>
      <td>${r.Promo}</td><td>${r['¿Se regala?']}</td>
      <td>${currency(r.Monto)}</td><td>${currency(r.Seña)}</td><td>${currency(r.Saldo)}</td>
      <td>${r.Etiquetas}</td>
    </tr>`
      )
      .join('\n');

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reservas ${dateStamp}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #18181b; }
  h1 { margin-bottom: 4px; }
  p.meta { color: #52525b; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; }
  th { background: #2563eb; color: white; }
  tfoot td { font-weight: bold; background: #f4f4f5; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Gestión de Reservas</h1>
  <p class="meta">${filterLabel} — Generado: ${formatDateTime(new Date().toISOString())}</p>
  <table>
    <thead>
      <tr><th>Sede</th><th>Fecha y hora</th><th>Cliente</th><th>Teléfono</th><th>Promo</th><th>Regalo</th><th>Monto</th><th>Seña</th><th>Saldo</th><th>Etiquetas</th></tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr><td colspan="6">Totales</td><td>${currency(totals.total)}</td><td>${currency(totals.deposit)}</td><td>${currency(pending)}</td><td></td></tr>
    </tfoot>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas-${dateStamp}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportPdf}
        disabled={rows.length === 0}
        className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        Exportar PDF
      </button>
      <button
        onClick={exportHtml}
        disabled={rows.length === 0}
        className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
      >
        Exportar HTML
      </button>
    </div>
  );
}
