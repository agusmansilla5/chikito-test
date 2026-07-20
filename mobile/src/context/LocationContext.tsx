import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Location } from '../types';

const STORAGE_KEY = 'nido-location-id';

type LocationContextValue = {
  locations: Location[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  loading: boolean;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLocations([]);
      setSelectedLocationIdState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data }, storedId] = await Promise.all([
        supabase.from('locations').select('*').order('created_at', { ascending: true }),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);
      if (cancelled) return;
      const list = (data as Location[]) ?? [];
      setLocations(list);
      if (storedId && list.some((l) => l.id === storedId)) {
        setSelectedLocationIdState(storedId);
      } else if (list.length > 0) {
        setSelectedLocationIdState(list[0].id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  function setSelectedLocationId(id: string) {
    setSelectedLocationIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  }

  const value = useMemo<LocationContextValue>(
    () => ({ locations, selectedLocationId, setSelectedLocationId, loading }),
    [locations, selectedLocationId, loading]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation debe usarse dentro de LocationProvider');
  return ctx;
}
