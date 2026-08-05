'use client';

import type { PurchaseOrderStatus } from '@/lib/types';
import { formatPlainDate } from '@/lib/date';

export type HistoryExportRow = {
  supplierName: string;
  orderDate: string;
  amount: number | null;
  paid: number;
  status: PurchaseOrderStatus;
  paymentStatusLabel: string;
  daysSinceOrder: number;
};

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pendiente: 'Pendiente de envío',
  pendiente_envio: 'Pendiente de envío',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

function rowsFor(orders: HistoryExportRow[]) {
  return orders.map((o) => ({
    Proveedor: o.supplierName,
    Fecha: formatPlainDate(o.orderDate),
    Monto: o.amount ?? '',
    Pagado: o.paid,
    Saldo: o.amount != null ? Math.max(0, o.amount - o.paid) : '',
    'Estado pedido': STATUS_LABEL[o.status],
    'Estado pago': o.paymentStatusLabel,
    'Días transcurridos': o.daysSinceOrder,
  }));
}

function currency(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

const buttonClass =
  'rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40';

export function HistoryExport({ orders }: { orders: HistoryExportRow[] }) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const totals = orders.reduce(
    (acc, o) => ({
      amount: acc.amount + (o.amount ?? 0),
      paid: acc.paid + o.paid,
    }),
    { amount: 0, paid: 0 }
  );
  const pending = Math.max(0, totals.amount - totals.paid);

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rowsFor(orders));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `pedidos-proveedores-${dateStamp}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Pedidos a proveedores', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 14, 23);
    autoTable(doc, {
      startY: 29,
      head: [['Proveedor', 'Fecha', 'Monto', 'Pagado', 'Saldo', 'Estado pedido', 'Estado pago', 'Días']],
      body: orders.map((o) => [
        o.supplierName,
        formatPlainDate(o.orderDate),
        o.amount != null ? currency(o.amount) : '—',
        currency(o.paid),
        o.amount != null ? currency(Math.max(0, o.amount - o.paid)) : '—',
        STATUS_LABEL[o.status],
        o.paymentStatusLabel,
        String(o.daysSinceOrder),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      foot: [['', '', 'Totales', currency(totals.amount), currency(totals.paid), currency(pending), '', '']],
      footStyles: { fillColor: [244, 244, 245], textColor: [24, 24, 27], fontStyle: 'bold' },
    });
    doc.save(`pedidos-proveedores-${dateStamp}.pdf`);
  }

  function exportHtml() {
    const bodyRows = rowsFor(orders)
      .map(
        (r) => `<tr>
      <td>${r.Proveedor}</td><td>${r.Fecha}</td>
      <td>${r.Monto !== '' ? currency(Number(r.Monto)) : '—'}</td>
      <td>${currency(Number(r.Pagado))}</td>
      <td>${r.Saldo !== '' ? currency(Number(r.Saldo)) : '—'}</td>
      <td>${r['Estado pedido']}</td><td>${r['Estado pago']}</td><td>${r['Días transcurridos']}</td>
    </tr>`
      )
      .join('\n');

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Pedidos ${dateStamp}</title>
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
  <h1>Pedidos a proveedores</h1>
  <p class="meta">Generado: ${new Date().toLocaleString('es-AR')}</p>
  <table>
    <thead>
      <tr><th>Proveedor</th><th>Fecha</th><th>Monto</th><th>Pagado</th><th>Saldo</th><th>Estado pedido</th><th>Estado pago</th><th>Días</th></tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr><td colspan="2">Totales</td><td>${currency(totals.amount)}</td><td>${currency(totals.paid)}</td><td>${currency(pending)}</td><td colspan="3"></td></tr>
    </tfoot>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-proveedores-${dateStamp}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={exportExcel} disabled={orders.length === 0} className={buttonClass}>
        Exportar Excel
      </button>
      <button onClick={exportPdf} disabled={orders.length === 0} className={buttonClass}>
        Exportar PDF
      </button>
      <button onClick={exportHtml} disabled={orders.length === 0} className={buttonClass}>
        Exportar HTML
      </button>
    </div>
  );
}
