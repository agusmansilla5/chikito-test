'use client';

import { useState } from 'react';
import type { ReservationChipKind, ReservationChipOption } from '@/lib/types';
import { createChipOption, deleteChipOption, updateChipOption } from './actions';

const DEFAULT_COLOR = '#6366f1';

function chipStyle(color: string) {
  return { backgroundColor: `${color}22`, color, borderColor: `${color}66` };
}

type Props = {
  kind: ReservationChipKind;
  chips: ReservationChipOption[];
  mode: 'single' | 'multiple';
  selectedId?: string | null;
  selectedIds?: string[];
  onSelectSingle?: (id: string | null) => void;
  onToggleMultiple?: (id: string) => void;
  onChipsChange: (chips: ReservationChipOption[]) => void;
  onDeleted: (id: string) => void;
};

export function ChipManager({
  kind,
  chips,
  mode,
  selectedId,
  selectedIds,
  onSelectSingle,
  onToggleMultiple,
  onChipsChange,
  onDeleted,
}: Props) {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    setError(null);
    const result = await createChipOption(kind, label, newColor);
    setBusy(false);
    if (result.error || !result.chip) {
      setError(result.error ?? 'No se pudo crear.');
      return;
    }
    onChipsChange([...chips, result.chip]);
    setNewLabel('');
    setNewColor(DEFAULT_COLOR);
  }

  function startEdit(chip: ReservationChipOption) {
    setEditingId(chip.id);
    setEditLabel(chip.label);
    setEditColor(chip.color);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const label = editLabel.trim();
    if (!label) return;
    setBusy(true);
    setError(null);
    const result = await updateChipOption(editingId, label, editColor);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChipsChange(chips.map((c) => (c.id === editingId ? { ...c, label, color: editColor } : c)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este chip? Se quita de todas las reservas que lo tengan asignado.')) return;
    setBusy(true);
    setError(null);
    const result = await deleteChipOption(id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChipsChange(chips.filter((c) => c.id !== id));
    onDeleted(id);
    if (editingId === id) setEditingId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const isSelected = mode === 'single' ? selectedId === chip.id : (selectedIds ?? []).includes(chip.id);
          return (
            <div key={chip.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  mode === 'single'
                    ? onSelectSingle?.(isSelected ? null : chip.id)
                    : onToggleMultiple?.(chip.id)
                }
                style={chipStyle(chip.color)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  isSelected ? 'ring-2 ring-accent ring-offset-1' : ''
                }`}
              >
                {chip.label}
              </button>
              <button
                type="button"
                onClick={() => startEdit(chip)}
                aria-label={`Editar ${chip.label}`}
                className="text-[11px] text-foreground/50 hover:text-foreground"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => handleDelete(chip.id)}
                aria-label={`Eliminar ${chip.label}`}
                className="text-[11px] text-foreground/50 hover:text-red-600"
              >
                ×
              </button>
            </div>
          );
        })}
        {chips.length === 0 && <p className="text-xs text-foreground/60">Todavía no hay opciones creadas.</p>}
      </div>

      {editingId && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-background p-2">
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <input
            type="color"
            value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            className="h-7 w-9 rounded border border-zinc-300 dark:border-zinc-700"
          />
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={busy}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="text-xs text-foreground/60 hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={kind === 'promo' ? 'Nueva promo…' : 'Nueva etiqueta…'}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-accent focus:outline-none dark:border-zinc-700"
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-7 w-9 rounded border border-zinc-300 dark:border-zinc-700"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || !newLabel.trim()}
          className="rounded-md border border-accent/40 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
        >
          + Agregar
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
