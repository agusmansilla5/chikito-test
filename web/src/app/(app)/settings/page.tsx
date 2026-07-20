import { SettingsClient } from './settings-client';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Configuración</h1>
      <SettingsClient />
    </div>
  );
}
