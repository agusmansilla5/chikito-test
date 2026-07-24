'use client';

import type { PurchaseOrderStatus } from '@/lib/types';
import { formatDate } from '@/lib/date';

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
    Fecha: formatDate(`${o.orderDate}T00:00:00`),
    Monto: o.amount ?? '',
    Pagado: o.paid,
    Saldo: o.amount != null ? Math.max(0, o.amount - o.paid) : '',
    'Estado pedido': STATUS_LABEL[o.status],
    'Estado pago': o.paymentStatusLabel,
    'Días transcurridos': o.daysSinceOrder,
  }));
}

export function HistoryExport({ orders }: { orders: HistoryExportRow[] }) {
  async function exportExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rowsFor(orders));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `pedidos-proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      onClick={exportExcel}
      disabled={orders.length === 0}
      className="rounded-md border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
    >
      Exportar Excel
    </button>
  );
}
