export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  accent: string;
};

// Keyed by mode so a custom color chosen in one mode never leaks into the other.
export type ThemeColorOverrides = Partial<Record<ThemeMode, ThemeColors>>;

export const THEME_MODE_KEY = 'nido-theme-mode';
export const THEME_COLORS_KEY = 'nido-theme-colors';

export const DEFAULT_COLORS: Record<ThemeMode, ThemeColors> = {
  light: { background: '#fafafa', surface: '#ffffff', accent: '#2563eb' },
  dark: { background: '#09090b', surface: '#18181b', accent: '#3b82f6' },
};

export const HEX_COLOR_REGEX = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

// Picks black or white text for readability on top of an arbitrary accent color (WCAG relative luminance).
export function contrastForeground(hex: string): string {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Kept in sync with the inline script in app/layout.tsx (which can't import this module).
// Only applies the override for the ACTIVE mode - the other mode's override (if any) stays untouched
// so it doesn't leak in as a stale inline style when the mode is switched later.
export const THEME_INIT_SCRIPT = `(function(){try{
var m=localStorage.getItem('${THEME_MODE_KEY}');
if(m!=='light'&&m!=='dark'){m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',m);
var all=JSON.parse(localStorage.getItem('${THEME_COLORS_KEY}')||'null');
var c=all&&typeof all==='object'?all[m]:null;
if(c&&typeof c==='object'){
if(c.background)document.documentElement.style.setProperty('--background',c.background);
if(c.surface)document.documentElement.style.setProperty('--surface',c.surface);
if(c.accent){
document.documentElement.style.setProperty('--accent',c.accent);
var hex=c.accent.length===4?'#'+c.accent[1]+c.accent[1]+c.accent[2]+c.accent[2]+c.accent[3]+c.accent[3]:c.accent;
var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
var lin=function(v){return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
var lum=0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
document.documentElement.style.setProperty('--accent-foreground',lum>0.5?'#000000':'#ffffff');
}
}
}catch(e){}})()`;
