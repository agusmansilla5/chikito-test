// Constantes compartidas entre cliente y servidor. Separadas de lib/location.ts
// porque ese archivo es "server-only" (usa next/headers) - importar cualquier cosa
// de ahí desde un componente cliente arrastra todo el módulo al bundle del browser.

export const LOCATION_COOKIE = 'nido_location_id';

// Valor especial de la cookie que representa "todos los locales" - una vista de
// solo lectura que suma el stock de cada local real, en vez de un local en sí.
export const ALL_LOCATIONS_VALUE = 'all';
