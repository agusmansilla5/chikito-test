'use client';

import { useState } from 'react';
import type { UserRole } from '@/lib/types';
import { inviteUser, updateUserRole, setUserActive } from './actions';

export type UserRow = {
  id: string;
  full_name: string;
  role: UserRole;
  email: string | null;
  active: boolean;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  auditor: 'Auditor',
  jefe: 'Jefe',
};

export function UsersClient({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('auditor');
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleInvite() {
    setError(null);
    setInvited(null);
    if (!email.trim() || !fullName.trim()) {
      setError('Completá el nombre y el email.');
      return;
    }
    setInviting(true);
    const result = await inviteUser(email.trim(), fullName.trim(), role);
    setInviting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInvited(email.trim());
    setEmail('');
    setFullName('');
    setRole('auditor');
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setBusyId(userId);
    const result = await updateUserRole(userId, newRole);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  }

  async function handleToggleActive(user: UserRow) {
    const action = user.active ? 'desactivar' : 'reactivar';
    if (!confirm(`¿Confirmás ${action} a "${user.full_name}"?`)) return;
    setBusyId(user.id);
    const result = await setUserActive(user.id, !user.active);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)));
  }

  return (
    <div className="max-w-3xl">
      <section className="mb-6 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <h2 className="mb-3 font-semibold text-foreground">Invitar usuario</h2>
        <div className="mb-2 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
          >
            <option value="admin">Admin</option>
            <option value="auditor">Auditor</option>
            <option value="jefe">Jefe</option>
          </select>
        </div>
        <button
          onClick={handleInvite}
          disabled={inviting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {inviting ? 'Invitando...' : '+ Invitar'}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {invited && (
          <p className="mt-2 text-sm text-green-600">
            Se envió un mail de invitación a {invited} para que elija su contraseña.
          </p>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground">
                  No hay usuarios cargados.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-medium text-foreground">{u.full_name}</td>
                <td className="px-4 py-2 text-foreground">{u.email ?? '—'}</td>
                <td className="px-4 py-2">
                  <select
                    value={u.role}
                    disabled={busyId === u.id || u.id === currentUserId}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                  >
                    <option value="admin">Admin</option>
                    <option value="auditor">Auditor</option>
                    <option value="jefe">Jefe</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      u.active
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400'
                        : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400'
                    }
                  >
                    {u.active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-foreground">Tu usuario</span>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={busyId === u.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {u.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-foreground">
        {ROLE_LABEL.admin}: gestiona todo. {ROLE_LABEL.auditor}: registra movimientos y auditorías. {ROLE_LABEL.jefe}:
        solo lectura.
      </p>
    </div>
  );
}
