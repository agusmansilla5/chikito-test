import type { PaymentStatus, PurchaseOrderPayment } from './types';

export function totalPaid(payments: Pick<PurchaseOrderPayment, 'amount'>[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function derivePaymentStatus(
  amount: number | null,
  payments: Pick<PurchaseOrderPayment, 'amount'>[]
): PaymentStatus {
  const paid = totalPaid(payments);
  if (paid <= 0) return 'pendiente';
  if (!amount || amount <= 0 || paid >= amount) return 'pagado';
  return 'parcial';
}

export function daysElapsed(orderDate: string): number {
  const ms = Date.now() - new Date(`${orderDate}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
