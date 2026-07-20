import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/dal';
import { getLocations } from '@/lib/location';
import { LocationsClient } from './locations-client';

export default async function LocationsPage() {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/dashboard');

  const locations = await getLocations();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Ubicaciones</h1>
      <LocationsClient initialLocations={locations} />
    </div>
  );
}
