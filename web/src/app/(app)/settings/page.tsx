import { SettingsClient } from './settings-client';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Configuración</h1>
      <SettingsClient />
    </div>
  );
}
