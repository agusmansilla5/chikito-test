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

// Para columnas SQL "date" (order_date, paid_at, filtros de rango de fecha):
// no tienen hora ni huso horario propios, son un día calendario tal cual se
// guardaron ("2026-07-24"). Pasarlas por formatDate (que fija todo a huso
// horario de Córdoba) las corre un día para atrás en un server que corre en
// UTC, porque "2026-07-24T00:00:00" se interpreta como medianoche UTC y
// Córdoba (UTC-3) todavía está en el día anterior a esa hora. Por eso estas
// fechas se formatean como texto plano, sin pasar por Date en ningún momento.
export function formatPlainDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function formatWeekday(value: string | Date): string {
  return new Date(value).toLocaleDateString('es-AR', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
  });
}
