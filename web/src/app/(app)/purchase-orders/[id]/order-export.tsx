'use client';

import { formatDate } from '@/lib/date';
import { buildOrderMessage, buildWhatsappLink } from '@/lib/whatsapp-message';

type ExportItem = { name: string; quantity: number; unit_cost: number | null };

export function OrderExport({
  orderDate,
  supplierName,
  locationName,
  amount,
  shippingDetail,
  items,
}: {
  orderDate: string;
  supplierName: string;
  locationName: string;
  amount: number | null;
  shippingDetail: string | null;
  items: ExportItem[];
}) {
  const message = buildOrderMessage({
    orderDate,
    destination: locationName,
    supplierName,
    items: items.map((i) => `${i.quantity} ${i.name}`),
    amount,
    shippingDetail,
  });

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(message);
      alert('Mensaje copiado al portapapeles.');
    } catch {
      alert('No se pudo copiar automáticamente. Copialo manualmente desde la vista previa.');
    }
  }

  function sendToWhatsapp() {
    window.open(buildWhatsappLink(message), '_blank');
  }

  async function exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Pedido a proveedor', 14, 16);
    doc.setFontSize(10);
    doc.text(`Fecha: ${formatDate(`${orderDate}T00:00:00`)}`, 14, 24);
    doc.text(`Local: ${locationName}`, 14, 30);
    doc.text(`Proveedor: ${supplierName}`, 14, 36);
    const shippingY = shippingDetail ? 42 : 36;
    if (shippingDetail) doc.text(`Envío: ${shippingDetail}`, 14, 42);
    autoTable(doc, {
      startY: shippingY + 6,
      head: [['Producto', 'Cantidad', 'Costo unitario']],
      body: items.map((i) => [
        i.name,
        String(i.quantity),
        i.unit_cost != null ? i.unit_cost.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '—',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`pedido-${orderDate}.pdf`);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={sendToWhatsapp}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Finalizar y mandar a WhatsApp
        </button>
        <button
          onClick={copyToClipboard}
          className="rounded-md border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
        >
          Copiar al portapapeles
        </button>
        <button
          onClick={exportPdf}
          className="rounded-md border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
        >
          Exportar PDF
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-background p-3 text-xs text-foreground dark:border-zinc-800">
        {message}
      </pre>
    </div>
  );
}
