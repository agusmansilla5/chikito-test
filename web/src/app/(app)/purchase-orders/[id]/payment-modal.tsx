'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Supplier } from '@/lib/types';
import { createPurchaseOrderPayment } from '../actions';

type SupplierBankInfo = Pick<Supplier, 'name' | 'cbu_cvu' | 'alias' | 'bank_name' | 'account_holder'>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentModal({
  orderId,
  supplier,
  remaining,
  onClose,
  onDone,
}: {
  orderId: string;
  supplier: SupplierBankInfo | null;
  remaining: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(remaining != null && remaining > 0 ? String(remaining) : '');
  const [paidAt, setPaidAt] = useState(todayIso());
  const [method, setMethod] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    setError(null);
    setSubmitting(true);

    let receiptPath: string | null = null;
    if (file) {
      const supabase = createClient();
      const path = `${orderId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('comprobantes-pedidos').upload(path, file);
      if (uploadError) {
        setSubmitting(false);
        setError(`No se pudo subir el comprobante: ${uploadError.message}`);
        return;
      }
      receiptPath = path;
    }

    const result = await createPurchaseOrderPayment(orderId, parsedAmount, paidAt, method.trim() || null, receiptPath);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-foreground">Registrar pago</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-xl leading-none text-foreground hover:text-red-600">
            ×
          </button>
        </div>

        {supplier && (supplier.cbu_cvu || supplier.alias) && (
          <div className="mb-4 rounded-md bg-background p-3 text-sm text-foreground">
            <p className="mb-1 font-medium">Datos para transferir a {supplier.name}</p>
            {supplier.alias && <p>Alias: {supplier.alias}</p>}
            {supplier.cbu_cvu && <p>CBU/CVU: {supplier.cbu_cvu}</p>}
            {supplier.bank_name && <p>Banco: {supplier.bank_name}</p>}
            {supplier.account_holder && <p>Titular: {supplier.account_holder}</p>}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-foreground">Monto pagado</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
        />

        <label className="mb-1 block text-sm font-medium text-foreground">Fecha de pago</label>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
        />

        <label className="mb-1 block text-sm font-medium text-foreground">Método (opcional)</label>
        <input
          type="text"
          placeholder="Transferencia, efectivo..."
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
        />

        <label className="mb-1 block text-sm font-medium text-foreground">Comprobante (opcional)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 w-full text-sm text-foreground"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
