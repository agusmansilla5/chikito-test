'use client';

import { useEffect, useState } from 'react';
import {
  contrastForeground,
  DEFAULT_COLORS,
  HEX_COLOR_REGEX,
  THEME_COLORS_KEY,
  THEME_MODE_KEY,
  type ThemeColorOverrides,
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

function readOverrides(): ThemeColorOverrides {
  try {
    const raw = localStorage.getItem(THEME_COLORS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistOverrides(overrides: ThemeColorOverrides) {
  if (Object.keys(overrides).length === 0) {
    localStorage.removeItem(THEME_COLORS_KEY);
  } else {
    localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(overrides));
  }
}

// Applies colors for whichever mode is currently active. Passing null clears the inline
// overrides entirely so the CSS preset for the active [data-theme] takes over - this must be
// called on every mode switch, otherwise a color chosen in one mode stays pinned via inline
// style (which always beats the other mode's CSS preset) while text keeps following the mode.
function applyColors(colors: ThemeColors | null) {
  const html = document.documentElement;
  if (colors) {
    html.style.setProperty('--background', colors.background);
    html.style.setProperty('--surface', colors.background);
    html.style.setProperty('--foreground', colors.text);
    html.style.setProperty('--accent', colors.accent);
    html.style.setProperty('--accent-foreground', contrastForeground(colors.accent));
  } else {
    html.style.removeProperty('--background');
    html.style.removeProperty('--surface');
    html.style.removeProperty('--foreground');
    html.style.removeProperty('--accent');
    html.style.removeProperty('--accent-foreground');
  }
}

const FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Color de fondo', hint: 'El fondo general de la página y de las casillas/tarjetas.' },
  { key: 'accent', label: 'Color de casillas', hint: 'Botones, links y estados activos en toda la app.' },
  { key: 'text', label: 'Color de las letras', hint: 'El color del texto en toda la app.' },
];

export function SettingsClient() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>('light');
  const [overrides, setOverrides] = useState<ThemeColorOverrides>({});
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

    const storedOverrides = readOverrides();

    setMode(initialMode);
    setOverrides(storedOverrides);
    setHexInputs(storedOverrides[initialMode] ?? DEFAULT_COLORS[initialMode]);
    setMounted(true);
  }, []);

  function handleModeChange(next: ThemeMode) {
    setMode(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_MODE_KEY, next);

    const nextColors = overrides[next] ?? null;
    applyColors(nextColors);
    setHexInputs(nextColors ?? DEFAULT_COLORS[next]);
    setHexErrors({});
  }

  function handleColorChange(key: keyof ThemeColors, rawValue: string) {
    const value = rawValue.trim();
    setHexInputs((prev) => ({ ...prev, [key]: value }));

    if (!HEX_COLOR_REGEX.test(value)) {
      setHexErrors((prev) => ({ ...prev, [key]: 'HEX inválido, ej: #ffffff' }));
      return;
    }
    setHexErrors((prev) => ({ ...prev, [key]: undefined }));

    const base = overrides[mode] ?? DEFAULT_COLORS[mode];
    const nextColors = { ...base, [key]: value };
    const nextOverrides = { ...overrides, [mode]: nextColors };
    setOverrides(nextOverrides);
    persistOverrides(nextOverrides);
    applyColors(nextColors);
  }

  function handleReset() {
    const nextOverrides = { ...overrides };
    delete nextOverrides[mode];
    setOverrides(nextOverrides);
    persistOverrides(nextOverrides);
    setHexInputs(DEFAULT_COLORS[mode]);
    setHexErrors({});
    applyColors(null);
  }

  if (!mounted) return null;

  const hasOverrideForMode = Boolean(overrides[mode]);

  return (
    <div className="max-w-xl">
      <section className="mb-8 rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <h2 className="mb-1 font-semibold text-foreground">Modo</h2>
        <p className="mb-4 text-sm text-foreground">Elegí entre modo claro y modo nocturno.</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('light')}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium ${
              mode === 'light'
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-zinc-300 text-foreground hover:bg-background dark:border-zinc-700'
            }`}
          >
            ☀️ Claro
          </button>
          <button
            onClick={() => handleModeChange('dark')}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium ${
              mode === 'dark'
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-zinc-300 text-foreground hover:bg-background dark:border-zinc-700'
            }`}
          >
            🌙 Oscuro
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Colores</h2>
            <p className="text-sm text-foreground">
              Personalizá los colores del modo {mode === 'light' ? 'claro' : 'oscuro'} en formato HEX.
            </p>
          </div>
          {hasOverrideForMode && (
            <button onClick={handleReset} className="text-sm font-medium text-foreground hover:text-red-600">
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
                <label className="mb-1 block text-sm font-medium text-foreground">{field.label}</label>
                <p className="mb-2 text-xs text-foreground">{field.hint}</p>
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
                    className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none dark:border-zinc-700"
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
