// Todas las fechas de la app se muestran fijas al huso horario de Córdoba, Argentina,
// sin importar en qué servidor/dispositivo corra el código (el server de Next corre en
// UTC en Vercel, así que sin esto las horas se mostrarían mal).
export const APP_TIME_ZONE = 'America/Argentina/Cordoba';

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('es-AR', {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString('es-AR', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('es-AR', {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatWeekday(value: string | Date): string {
  return new Date(value).toLocaleDateString('es-AR', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
  });
}
