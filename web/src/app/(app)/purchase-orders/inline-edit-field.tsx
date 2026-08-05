'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePurchaseOrderFields } from './actions';

export function InlineEditField({
  orderId,
  field,
  value,
  placeholder,
  maxWidthClass = 'max-w-full',
}: {
  orderId: string;
  field: 'alias' | 'note';
  value: string | null;
  placeholder: string;
  maxWidthClass?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed === (value ?? '')) return;
    setSaving(true);
    const result = await updatePurchaseOrderFields(orderId, { [field]: trimmed || null });
    setSaving(false);
    if (result.error) {
      alert(result.error);
      setDraft(value ?? '');
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(value ?? '');
            setEditing(false);
          }
        }}
        className="w-full rounded-md border border-accent px-2 py-1 text-sm focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click para editar"
      className={`block ${maxWidthClass} whitespace-normal break-words text-left text-foreground hover:underline`}
    >
      {value?.trim() ? value : <span className="text-foreground/40">{placeholder}</span>}
    </button>
  );
}
