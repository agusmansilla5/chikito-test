import { requireProfile } from '@/lib/dal';
import { Sidebar } from './sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen w-full bg-zinc-50">
      <Sidebar profile={profile} />
      <main className="w-full flex-1 overflow-x-hidden px-8 py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
