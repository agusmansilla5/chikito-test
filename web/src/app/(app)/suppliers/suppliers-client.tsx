'use client';

import { useState } from 'react';
import type { Supplier } from '@/lib/types';
import { createSupplier, updateSupplier, deleteSupplier } from './actions';

export function SuppliersClient({
  initialSuppliers,
  canEdit,
  isAdmin,
}: {
  initialSuppliers: Supplier[];
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Ingresá un nombre.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await createSupplier(name.trim(), phone.trim() || null, email.trim() || null, notes.trim() || null);
    setSubmitting(false);
    if (result.error || !result.supplier) {
      setError(result.error);
      return;
    }
    setSuppliers((prev) => [...prev, result.supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditPhone(s.phone ?? '');
    setEditEmail(s.email ?? '');
    setEditNotes(s.notes ?? '');
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    const result = await updateSupplier(
      id,
      editName.trim(),
      editPhone.trim() || null,
      editEmail.trim() || null,
      editNotes.trim() || null
    );
    if (result.error) {
      alert(result.error);
      return;
    }
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, name: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null, notes: editNotes.trim() || null }
          : s
      )
    );
    setEditingId(null);
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`¿Eliminar el proveedor "${s.name}"?`)) return;
    const result = await deleteSupplier(s.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
  }

  return (
    <div className="max-w-3xl">
      {canEdit && (
        <section className="mb-6 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
          <h2 className="mb-3 font-semibold text-foreground">Nuevo proveedor</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
            />
            <input
              type="text"
              placeholder="Teléfono (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
            />
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            <input
              type="email"
              placeholder="Email (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
            />
            <input
              type="text"
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Agregando...' : '+ Agregar proveedor'}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Teléfono</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Notas</th>
              {canEdit && <th className="px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-foreground">
                  No hay proveedores cargados.
                </td>
              </tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                {editingId === s.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleSaveEdit(s.id)} className="mr-3 text-accent hover:underline">
                        Guardar
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-foreground hover:underline">
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-2 text-foreground">{s.phone ?? '—'}</td>
                    <td className="px-4 py-2 text-foreground">{s.email ?? '—'}</td>
                    <td className="px-4 py-2 text-foreground">{s.notes ?? '—'}</td>
                    {canEdit && (
                      <td className="px-4 py-2">
                        <button onClick={() => startEdit(s)} className="mr-3 text-accent hover:underline">
                          Editar
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
