// Borrador del formulario de pedido en localStorage, por local (para que dos
// locales no se pisen el borrador si se cambia de local sin enviar). Mismo
// estilo simple de JSON.stringify/parse que ya usa theme.ts - acá se agrega
// debounce en el componente porque este form tiene muchos campos que
// cambian por tecla.
const DRAFT_KEY_PREFIX = 'nido-order-draft';

function draftKey(locationId: string): string {
  return `${DRAFT_KEY_PREFIX}:${locationId}`;
}

export function loadDraft<T>(locationId: string): T | null {
  try {
    const raw = localStorage.getItem(draftKey(locationId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(locationId: string, data: T): void {
  try {
    localStorage.setItem(draftKey(locationId), JSON.stringify(data));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) - el borrador es
    // una mejora, no algo de lo que dependa el flujo principal.
  }
}

export function clearDraft(locationId: string): void {
  try {
    localStorage.removeItem(draftKey(locationId));
  } catch {
    // ver nota en saveDraft
  }
}
