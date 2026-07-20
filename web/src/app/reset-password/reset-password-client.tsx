'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from './actions';

export function ResetPasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  if (done) {
    return <p className="text-center text-sm text-zinc-300">Contraseña actualizada. Ingresando...</p>;
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-300" htmlFor="password">
        Nueva contraseña
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
      />

      <label className="mb-1 block text-sm font-medium text-zinc-300" htmlFor="confirmPassword">
        Confirmar contraseña
      </label>
      <input
        id="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
      />

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Guardando...' : 'Guardar nueva contraseña'}
      </button>
    </div>
  );
}
