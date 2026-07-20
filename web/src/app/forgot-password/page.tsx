import Link from 'next/link';
import { requestPasswordReset } from './actions';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-black px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nido-logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />

      <div className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nido-logo.png" alt="NIDO" className="mx-auto mb-2 h-16 w-auto" />
        <p className="mb-6 text-center text-sm font-medium text-zinc-400">Recuperar contraseña</p>

        {sent ? (
          <div>
            <p className="mb-6 text-center text-sm text-zinc-300">
              Si el email está registrado, te enviamos un link para elegir una nueva contraseña. Revisá tu bandeja
              de entrada (y la carpeta de spam).
            </p>
            <Link
              href="/login"
              className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Volver a ingresar
            </Link>
          </div>
        ) : (
          <form action={requestPasswordReset}>
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

            <button
              type="submit"
              className="mb-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Enviar link de recuperación
            </button>

            <Link href="/login" className="block text-center text-sm text-zinc-400 hover:underline">
              Volver a ingresar
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
