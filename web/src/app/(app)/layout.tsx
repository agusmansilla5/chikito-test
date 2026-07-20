import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue } from '@/lib/location';
import { AppShell } from './app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const locations = await getLocations();
  const selectedLocationValue = await getSelectedLocationValue(locations);

  return (
    <AppShell profile={profile} locations={locations} selectedLocationValue={selectedLocationValue}>
      {children}
    </AppShell>
  );
}
