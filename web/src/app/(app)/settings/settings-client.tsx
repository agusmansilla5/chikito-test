'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_COLORS,
  HEX_COLOR_REGEX,
  THEME_COLORS_KEY,
  THEME_MODE_KEY,
  type ThemeColors,
  type ThemeMode,
} from '@/lib/theme';

function expandHex(hex: string): string {
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}

function applyMode(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_MODE_KEY, mode);
}

function applyColors(colors: ThemeColors | null) {
  if (colors) {
    document.documentElement.style.setProperty('--background', colors.background);
    document.documentElement.style.setProperty('--surface', colors.surface);
    localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(colors));
  } else {
    document.documentElement.style.removeProperty('--background');
    document.documentElement.style.removeProperty('--surface');
    localStorage.removeItem(THEME_COLORS_KEY);
  }
}

const FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Color de fondo', hint: 'El fondo general de la página, detrás de las casillas.' },
  { key: 'surface', label: 'Color de las casillas', hint: 'Tarjetas, tablas y recuadros de contenido.' },
];

export function SettingsClient() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>('light');
  const [customColors, setCustomColors] = useState<ThemeColors | null>(null);
  const [hexInputs, setHexInputs] = useState<ThemeColors>(DEFAULT_COLORS.light);
  const [hexErrors, setHexErrors] = useState<Partial<Record<keyof ThemeColors, string>>>({});

  useEffect(() => {
    const storedMode = localStorage.getItem(THEME_MODE_KEY);
    const initialMode: ThemeMode =
      storedMode === 'light' || storedMode === 'dark'
        ? storedMode
        : window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    let storedColors: ThemeColors | null = null;
    try {
      const raw = localStorage.getItem(THEME_COLORS_KEY);
      storedColors = raw ? JSON.parse(raw) : null;
    } catch {
      storedColors = null;
    }

    setMode(initialMode);
    setCustomColors(storedColors);
    setHexInputs(storedColors ?? DEFAULT_COLORS[initialMode]);
    setMounted(true);
  }, []);

  function handleModeChange(next: ThemeMode) {
    setMode(next);
    applyMode(next);
    if (!customColors) setHexInputs(DEFAULT_COLORS[next]);
  }

  function handleColorChange(key: keyof ThemeColors, rawValue: string) {
    const value = rawValue.trim();
    setHexInputs((prev) => ({ ...prev, [key]: value }));

    if (!HEX_COLOR_REGEX.test(value)) {
      setHexErrors((prev) => ({ ...prev, [key]: 'HEX inválido, ej: #ffffff' }));
      return;
    }
    setHexErrors((prev) => ({ ...prev, [key]: undefined }));

    const base = customColors ?? DEFAULT_COLORS[mode];
    const next = { ...base, [key]: value };
    setCustomColors(next);
    applyColors(next);
  }

  function handleReset() {
    setCustomColors(null);
    setHexInputs(DEFAULT_COLORS[mode]);
    setHexErrors({});
    applyColors(null);
  }

  if (!mounted) return null;

  return (
    <div className="max-w-xl">
      <section className="mb-8 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">Modo</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Elegí entre modo claro y modo nocturno.</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('light')}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium ${
              mode === 'light'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-zinc-300 text-zinc-700 hover:bg-background dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            ☀️ Claro
          </button>
          <button
            onClick={() => handleModeChange('dark')}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium ${
              mode === 'dark'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-zinc-300 text-zinc-700 hover:bg-background dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            🌙 Oscuro
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Colores</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Personalizá los colores en formato HEX.</p>
          </div>
          {customColors && (
            <button
              onClick={handleReset}
              className="text-sm font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400"
            >
              Restablecer
            </button>
          )}
        </div>

        <div className="space-y-5">
          {FIELDS.map((field) => {
            const value = hexInputs[field.key];
            const error = hexErrors[field.key];
            return (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {field.label}
                </label>
                <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{field.hint}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={HEX_COLOR_REGEX.test(value) ? expandHex(value) : DEFAULT_COLORS[mode][field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-transparent p-1 dark:border-zinc-700"
                    aria-label={`Selector de color para ${field.label.toLowerCase()}`}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    placeholder="#ffffff"
                    className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
