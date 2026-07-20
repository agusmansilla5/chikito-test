export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
};

export const THEME_MODE_KEY = 'nido-theme-mode';
export const THEME_COLORS_KEY = 'nido-theme-colors';

export const DEFAULT_COLORS: Record<ThemeMode, ThemeColors> = {
  light: { background: '#fafafa', surface: '#ffffff' },
  dark: { background: '#09090b', surface: '#18181b' },
};

export const HEX_COLOR_REGEX = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

// Kept in sync with the inline script in app/layout.tsx (which can't import this module).
export const THEME_INIT_SCRIPT = `(function(){try{
var m=localStorage.getItem('${THEME_MODE_KEY}');
if(m!=='light'&&m!=='dark'){m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',m);
var c=JSON.parse(localStorage.getItem('${THEME_COLORS_KEY}')||'null');
if(c&&typeof c==='object'){
if(c.background)document.documentElement.style.setProperty('--background',c.background);
if(c.surface)document.documentElement.style.setProperty('--surface',c.surface);
}
}catch(e){}})()`;
