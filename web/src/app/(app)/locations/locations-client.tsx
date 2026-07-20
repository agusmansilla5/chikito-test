'use client';

import { useState } from 'react';
import type { Location } from '@/lib/types';
import { createLocation, updateLocation, deleteLocation } from './actions';

export function LocationsClient({ initialLocations }: { initialLocations: Location[] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Ingresá un nombre.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await createLocation(name.trim(), address.trim() || null);
    setSubmitting(false);
    if (result.error || !result.location) {
      setError(result.error);
      return;
    }
    setLocations((prev) => [...prev, result.location]);
    setName('');
    setAddress('');
  }

  function startEdit(l: Location) {
    setEditingId(l.id);
    setEditName(l.name);
    setEditAddress(l.address ?? '');
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    const result = await updateLocation(id, editName.trim(), editAddress.trim() || null);
    if (result.error) {
      alert(result.error);
      return;
    }
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name: editName.trim(), address: editAddress.trim() || null } : l))
    );
    setEditingId(null);
  }

  async function handleDelete(l: Location) {
    if (!confirm(`¿Eliminar el local "${l.name}"?`)) return;
    const result = await deleteLocation(l.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setLocations((prev) => prev.filter((x) => x.id !== l.id));
  }

  return (
    <div className="max-w-2xl">
      <section className="mb-6 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <h2 className="mb-3 font-semibold text-foreground">Nuevo local</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Nombre (ej: Sucursal Centro)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <input
            type="text"
            placeholder="Dirección (opcional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Agregando...' : '+ Agregar local'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Dirección</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-foreground">
                  No hay locales cargados.
                </td>
              </tr>
            )}
            {locations.map((l) => (
              <tr key={l.id} className="border-t border-zinc-100 dark:border-zinc-800">
                {editingId === l.id ? (
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
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleSaveEdit(l.id)} className="mr-3 text-accent hover:underline">
                        Guardar
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-foreground hover:underline">
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-medium text-foreground">{l.name}</td>
                    <td className="px-4 py-2 text-foreground">{l.address ?? '—'}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => startEdit(l)} className="mr-3 text-accent hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(l)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </td>
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
