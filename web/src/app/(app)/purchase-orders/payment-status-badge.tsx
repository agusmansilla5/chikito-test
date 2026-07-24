import type { PaymentStatus } from '@/lib/types';

const LABEL: Record<PaymentStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
};

export function PaymentStatusBadge({ status, daysSinceOrder }: { status: PaymentStatus; daysSinceOrder: number }) {
  const overdue = daysSinceOrder > 7;
  const className =
    status === 'pagado'
      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
      : overdue
        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {LABEL[status]}
      {status !== 'pagado' && ` · ${daysSinceOrder}d`}
    </span>
  );
}
