import { ResetPasswordClient } from './reset-password-client';

export default function ResetPasswordPage() {
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
        <p className="mb-6 text-center text-sm font-medium text-zinc-400">Elegí tu nueva contraseña</p>

        <ResetPasswordClient />
      </div>
    </div>
  );
}
