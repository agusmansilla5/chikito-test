export type OrderMessageInput = {
  orderDate: string; // 'YYYY-MM-DD'
  destination: string;
  supplierName: string;
  items: string[];
  amount: number | null;
  shippingDetail: string | null;
};

export function buildOrderMessage(input: OrderMessageInput): string {
  const [, month, day] = input.orderDate.split('-');
  const amountText =
    input.amount != null
      ? input.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
      : '—';

  return [
    `[${day}/${month}]`,
    '',
    `[${input.destination}]`,
    '',
    `Proveedor: ${input.supplierName}`,
    '',
    'Producto:',
    ...input.items.map((item) => `- ${item}`),
    '',
    `Monto: ${amountText}`,
    '',
    `Envío: ${input.shippingDetail?.trim() || '—'}`,
  ].join('\n');
}

// No se puede pre-seleccionar un grupo de WhatsApp desde un link (la API
// pública de wa.me/api.whatsapp.com solo admite un número de contacto
// individual o, sin número, abrir el selector de chats) - por eso este link
// va sin número: abre WhatsApp con el texto ya cargado y el usuario elige a
// mano el grupo "PEDIDOS NIDO". No es un bug, es el máximo que permite
// WhatsApp sin usar su API de negocio.
export function buildWhatsappLink(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
