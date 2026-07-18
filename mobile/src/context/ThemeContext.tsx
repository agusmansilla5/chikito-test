import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTheme, DEFAULT_PRIMARY, type ThemeMode } from '../theme';

const STORAGE_KEY = 'nido-theme-prefs';

type ThemeContextValue = {
  mode: ThemeMode;
  primaryColor: string;
  colors: ReturnType<typeof buildTheme>['colors'];
  card: ReturnType<typeof buildTheme>['card'];
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (hex: string) => void;
  resetPrimaryColor: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_PRIMARY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.mode === 'light' || parsed.mode === 'dark') setModeState(parsed.mode);
          if (typeof parsed.primaryColor === 'string') setPrimaryColorState(parsed.primaryColor);
        } catch {
          // ignora preferencias corruptas
        }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, primaryColor }));
  }, [mode, primaryColor, loaded]);

  const { colors, card } = useMemo(() => buildTheme(mode, primaryColor), [mode, primaryColor]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      primaryColor,
      colors,
      card,
      setMode: setModeState,
      setPrimaryColor: setPrimaryColorState,
      resetPrimaryColor: () => setPrimaryColorState(DEFAULT_PRIMARY),
    }),
    [mode, primaryColor, colors, card]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
