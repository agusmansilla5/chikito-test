'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let active = true;
    let controlsRef: IScannerControls | null = null;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (!active || !result) return;
        active = false;
        controlsRef?.stop();
        onScan(result.getText());
      })
      .then((controls) => {
        controlsRef = controls;
        if (!active) controls.stop();
      })
      .catch(() => {
        setError('No se pudo acceder a la cámara. Revisá los permisos del navegador para este sitio.');
      });

    return () => {
      active = false;
      controlsRef?.stop();
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl">
        <video ref={videoRef} className="w-full" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-3/4 rounded-lg border-2 border-white/80" />
        </div>
      </div>
      <p className="mt-4 text-sm text-white/80">Apuntá al código de barras del producto</p>
      {error && <p className="mt-2 max-w-sm text-center text-sm text-red-400">{error}</p>}
      <button
        onClick={onClose}
        className="mt-6 rounded-md bg-white px-6 py-3 text-sm font-medium text-black hover:bg-zinc-200"
      >
        Cancelar
      </button>
    </div>
  );
}
