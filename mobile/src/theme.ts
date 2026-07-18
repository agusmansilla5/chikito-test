export type ThemeMode = 'light' | 'dark';

export const DEFAULT_PRIMARY = '#2563eb';

export const PRESET_COLORS = [
  '#2563eb', // azul
  '#dc2626', // rojo
  '#16a34a', // verde
  '#9333ea', // violeta
  '#ea580c', // naranja
  '#0d9488', // verde azulado
  '#db2777', // rosa
  '#71717a', // gris
];

export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const LIGHT_BASE = {
  background: '#f4f4f5',
  surface: '#ffffff',
  border: '#e4e4e7',
  text: '#18181b',
  textMuted: '#71717a',
  green: '#16a34a',
  red: '#dc2626',
};

const DARK_BASE = {
  background: '#09090b',
  surface: '#1c1c1f',
  border: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  green: '#4ade80',
  red: '#f87171',
};

export function buildTheme(mode: ThemeMode, primaryColor: string) {
  const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE;
  const safePrimary = isValidHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY;

  const colors = {
    ...base,
    primary: safePrimary,
    primarySoft: hexToRgba(safePrimary, mode === 'dark' ? 0.22 : 0.1),
  };

  const card = {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: mode === 'dark' ? 0.4 : 0.04,
    shadowRadius: 3,
    elevation: 1,
  };

  return { colors, card };
}

export type ThemeColors = ReturnType<typeof buildTheme>['colors'];
export type ThemeCard = ReturnType<typeof buildTheme>['card'];
