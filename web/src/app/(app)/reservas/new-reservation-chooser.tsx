'use client';

import { useRef, useState } from 'react';
import type { ReservationChipOption, ReservationVenue } from '@/lib/types';
import { ReservationModal } from './reservation-modal';
import { parseReservationFromImage, parseReservationFromText, type ParsedReservationDraft } from './parse-actions';

type Step = 'choose' | 'text' | 'image' | 'form';

const optionButtonClass =
  'flex flex-col items-start gap-1 rounded-lg border border-zinc-200 p-4 text-left hover:border-accent hover:bg-accent/5 dark:border-zinc-700';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function splitDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

export function NewReservationChooser({
  promoChips,
  tagChips,
  defaultVenue,
  onClose,
  onDone,
  onChipsChange,
}: {
  promoChips: ReservationChipOption[];
  tagChips: ReservationChipOption[];
  defaultVenue: ReservationVenue;
  onClose: () => void;
  onDone: () => void;
  onChipsChange: (kind: 'promo' | 'tag', chips: ReservationChipOption[]) => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ mediaType: string; base64: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParsedReservationDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleParseText() {
    if (!text.trim()) {
      setError('Pegá el texto de la reserva.');
      return;
    }
    setError(null);
    setParsing(true);
    const result = await parseReservationFromText(text);
    setParsing(false);
    if (result.error || !result.draft) {
      setError(result.error ?? 'No se pudo interpretar el texto.');
      return;
    }
    setDraft(result.draft);
    setStep('form');
  }

  async function handleParseImage() {
    if (!imageData) {
      setError('Pegá o subí una imagen primero.');
      return;
    }
    setError(null);
    setParsing(true);
    const result = await parseReservationFromImage(imageData.base64, imageData.mediaType);
    setParsing(false);
    if (result.error || !result.draft) {
      setError(result.error ?? 'No se pudo interpretar la imagen.');
      return;
    }
    setDraft(result.draft);
    setStep('form');
  }

  async function handleImageFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Ese archivo no es una imagen.');
      return;
    }
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    const split = splitDataUrl(dataUrl);
    if (!split) {
      setError('No se pudo leer la imagen.');
      return;
    }
    setImagePreview(dataUrl);
    setImageData(split);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const file = item.getAsFile();
    void handleImageFile(file);
  }

  if (step === 'form') {
    return (
      <ReservationModal
        reservation={null}
        draft={draft}
        promoChips={promoChips}
        tagChips={tagChips}
        defaultVenue={defaultVenue}
        onClose={onClose}
        onDone={onDone}
        onChipsChange={onChipsChange}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-foreground">Nueva reserva</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-xl leading-none text-foreground hover:text-red-600">
            ×
          </button>
        </div>

        {step === 'choose' && (
          <div className="space-y-3">
            <p className="mb-1 text-sm text-foreground">¿Cómo querés cargarla?</p>
            <button className={optionButtonClass} onClick={() => setStep('form')}>
              <span className="font-medium text-foreground">✍️ Cargar manualmente</span>
              <span className="text-xs text-foreground/70">Completar el formulario vos mismo, campo por campo.</span>
            </button>
            <button className={optionButtonClass} onClick={() => setStep('text')}>
              <span className="font-medium text-foreground">📋 Pegar texto</span>
              <span className="text-xs text-foreground/70">
                Pegá un mensaje (ej. de WhatsApp) y la IA completa el formulario por vos.
              </span>
            </button>
            <button className={optionButtonClass} onClick={() => setStep('image')}>
              <span className="font-medium text-foreground">🖼️ Pegar imagen</span>
              <span className="text-xs text-foreground/70">
                Pegá una captura de pantalla o subí una foto con los datos de la reserva.
              </span>
            </button>
          </div>
        )}

        {step === 'text' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Pegá el texto de la reserva</label>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Ej: hola quiero reservar para el sábado a las 23, somos 6, mi nombre es Juan, seña 20 mil por transferencia..."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setStep('choose')}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
              >
                ← Volver
              </button>
              <button
                onClick={handleParseText}
                disabled={parsing}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {parsing ? 'Interpretando...' : 'Interpretar con IA'}
              </button>
            </div>
          </div>
        )}

        {step === 'image' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Imagen de la reserva</label>
            <div
              tabIndex={0}
              onPaste={handlePaste}
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[10rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-300 p-4 text-center text-sm text-foreground/70 focus:border-accent focus:outline-none dark:border-zinc-700"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Vista previa" className="max-h-48 rounded-md object-contain" />
              ) : (
                <>
                  <span>Hacé click acá y pegá con Ctrl+V,</span>
                  <span>o hacé click para subir un archivo</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImageFile(e.target.files?.[0])}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setStep('choose')}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:hover:bg-zinc-800"
              >
                ← Volver
              </button>
              <button
                onClick={handleParseImage}
                disabled={parsing || !imageData}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {parsing ? 'Interpretando...' : 'Interpretar con IA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
