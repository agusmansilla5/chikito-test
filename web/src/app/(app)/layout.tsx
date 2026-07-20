import { requireProfile } from '@/lib/dal';
import { getLocations, getSelectedLocationValue } from '@/lib/location';
import { Sidebar } from './sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const locations = await getLocations();
  const selectedLocationValue = await getSelectedLocationValue(locations);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar profile={profile} locations={locations} selectedLocationValue={selectedLocationValue} />
      <main className="w-full flex-1 overflow-x-hidden px-8 py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
