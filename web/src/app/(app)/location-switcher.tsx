'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Location } from '@/lib/types';
import { ALL_LOCATIONS_VALUE } from '@/lib/location-constants';
import { setLocation, createLocation, renameLocation } from './locations/actions';

export function LocationSwitcher({
  locations,
  selectedValue,
  isAdmin,
}: {
  locations: Location[];
  selectedValue: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Anidado tipo acordeón (como "Pedidos" con sus sub-ítems): arranca
  // desplegado si ya hay un sector puntual elegido, para no esconder dónde
  // está parado el usuario.
  const [open, setOpen] = useState(selectedValue !== ALL_LOCATIONS_VALUE && selectedValue !== null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (locations.length === 0 && !isAdmin) return null;

  const isAll = selectedValue === ALL_LOCATIONS_VALUE;
  const currentSectorName = locations.find((l) => l.id === selectedValue)?.name;

  function handleSelect(value: string) {
    startTransition(async () => {
      await setLocation(value);
      router.refresh();
    });
  }

  function startEdit(l: Location) {
    setEditingId(l.id);
    setEditName(l.name);
    setError(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    const result = await renameLocation(id, editName.trim());
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const result = await createLocation(newName.trim(), null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewName('');
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-zinc-300 dark:border-zinc-700">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => handleSelect(ALL_LOCATIONS_VALUE)}
          disabled={isPending}
          className={`flex flex-1 items-center gap-2 truncate px-3 py-2 text-left text-sm font-semibold disabled:opacity-50 ${
            isAll ? 'text-accent' : 'text-foreground'
          }`}
        >
          🏠 NIDO
          {!isAll && currentSectorName && (
            <span className="truncate text-xs font-normal text-foreground">· {currentSectorName}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Contraer sectores' : 'Expandir sectores'}
          className="px-3 py-2 text-xs text-foreground"
        >
          {open ? '▾' : '▸'}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200 pl-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => handleSelect(ALL_LOCATIONS_VALUE)}
            className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-background ${
              isAll ? 'font-semibold text-accent' : 'text-foreground'
            }`}
          >
            Vista general (todos los locales)
          </button>

          {locations.map((l) => (
            <div key={l.id} className="flex items-center border-t border-zinc-100 dark:border-zinc-800">
              {editingId === l.id ? (
                <div className="flex flex-1 items-center gap-1 px-2 py-1.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(l.id)}
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(l.id)}
                    className="px-1 text-accent"
                    aria-label="Guardar nombre"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-1 text-foreground"
                    aria-label="Cancelar edición"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={`flex-1 truncate px-3 py-2 text-left text-sm hover:bg-background ${
                      selectedValue === l.id ? 'font-semibold text-accent' : 'text-foreground'
                    }`}
                  >
                    📍 {l.name}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => startEdit(l)}
                      className="px-2 text-foreground hover:text-accent"
                      aria-label={`Editar ${l.name}`}
                    >
                      ✏️
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {isAdmin && (
            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
              {adding ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Nombre del local"
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                  />
                  <button type="button" onClick={handleAdd} className="px-1 text-accent" aria-label="Agregar local">
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="px-1 text-foreground"
                    aria-label="Cancelar"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="w-full rounded px-2 py-1.5 text-left text-sm font-medium text-accent hover:bg-background"
                >
                  + Agregar local
                </button>
              )}
              {error && <p className="mt-1 px-2 text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
