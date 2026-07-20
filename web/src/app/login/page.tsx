import Link from 'next/link';
import { login } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-black px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nido-logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />

      <form
        action={login}
        className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl backdrop-blur-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nido-logo.png" alt="NIDO" className="mx-auto mb-2 h-16 w-auto" />
        <p className="mb-6 text-center text-sm font-medium text-zinc-400">Control de Stock y Auditoría</p>

        <label className="mb-1 block text-sm font-medium text-zinc-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-300" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
        />

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          className="mb-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ingresar
        </button>

        <Link href="/forgot-password" className="block text-center text-sm text-zinc-400 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </div>
  );
}
