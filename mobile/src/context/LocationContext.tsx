import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Location } from '../types';

const STORAGE_KEY = 'nido-location-id';

// Valor especial que representa "todos los locales" - una vista de solo lectura que
// suma el stock de cada local real, en vez de un local en sí.
export const ALL_LOCATIONS_VALUE = 'all';

type LocationContextValue = {
  locations: Location[];
  selectedLocationValue: string | null;
  setSelectedLocationValue: (value: string) => void;
  isAllLocations: boolean;
  // El id de local real seleccionado, o null si estamos en la vista general (o si
  // todavía no hay ningún local) - para usar directo en escrituras.
  realLocationId: string | null;
  loading: boolean;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationValue, setSelectedLocationValueState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLocations([]);
      setSelectedLocationValueState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data }, storedValue] = await Promise.all([
        supabase.from('locations').select('*').order('created_at', { ascending: true }),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);
      if (cancelled) return;
      const list = (data as Location[]) ?? [];
      setLocations(list);
      if (storedValue === ALL_LOCATIONS_VALUE) {
        setSelectedLocationValueState(ALL_LOCATIONS_VALUE);
      } else if (storedValue && list.some((l) => l.id === storedValue)) {
        setSelectedLocationValueState(storedValue);
      } else if (list.length > 0) {
        setSelectedLocationValueState(list[0].id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  function setSelectedLocationValue(value: string) {
    setSelectedLocationValueState(value);
    AsyncStorage.setItem(STORAGE_KEY, value);
  }

  const isAllLocations = selectedLocationValue === ALL_LOCATIONS_VALUE;

  const value = useMemo<LocationContextValue>(
    () => ({
      locations,
      selectedLocationValue,
      setSelectedLocationValue,
      isAllLocations,
      realLocationId: isAllLocations ? null : selectedLocationValue,
      loading,
    }),
    [locations, selectedLocationValue, isAllLocations, loading]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation debe usarse dentro de LocationProvider');
  return ctx;
}
