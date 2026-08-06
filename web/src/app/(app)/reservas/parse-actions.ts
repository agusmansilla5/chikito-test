'use server';

import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { formatDate } from '@/lib/date';
import type { ReservationVenue } from '@/lib/types';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false, error: 'No autorizado.' };
  return { ok: true };
}

export type ParsedReservationDraft = {
  venue: ReservationVenue | null;
  eventAtIso: string | null;
  customerName: string | null;
  customerAge: number | null;
  customerPhone: string | null;
  promoLabelGuess: string | null;
  promoDetail: string | null;
  isGift: boolean | null;
  totalAmount: number | null;
  depositAmount: number | null;
  depositDetail: string | null;
  tagLabelGuesses: string[];
};

type ExtractionContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
        data: string;
      };
    };

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    venue: { type: ['string', 'null'], enum: ['nido', 'canario', 'room347', 'el_pasillo', null] },
    event_at_iso: { type: ['string', 'null'] },
    customer_name: { type: ['string', 'null'] },
    customer_age: { type: ['integer', 'null'] },
    customer_phone: { type: ['string', 'null'] },
    promo_label_guess: { type: ['string', 'null'] },
    promo_detail: { type: ['string', 'null'] },
    is_gift: { type: ['boolean', 'null'] },
    total_amount: { type: ['number', 'null'] },
    deposit_amount: { type: ['number', 'null'] },
    deposit_detail: { type: ['string', 'null'] },
    tag_label_guesses: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'venue',
    'event_at_iso',
    'customer_name',
    'customer_age',
    'customer_phone',
    'promo_label_guess',
    'promo_detail',
    'is_gift',
    'total_amount',
    'deposit_amount',
    'deposit_detail',
    'tag_label_guesses',
  ],
  additionalProperties: false,
};

function buildInstructions(): string {
  return `Sos un asistente que extrae datos de una reserva de evento/mesa en un boliche, a partir de texto libre (ej. un mensaje de WhatsApp) o una imagen (captura de chat, foto de una anotación, etc.).

Hoy es ${formatDate(new Date())} (huso horario America/Argentina/Cordoba).

Reglas:
- Las sedes válidas son exactamente: nido, canario, room347, el_pasillo. Si no se menciona ninguna sede o no coincide con estas, dejá "venue" en null.
- Para la fecha del evento: si el texto usa una referencia relativa ("el sábado", "mañana", "el 15"), calculá la fecha real tomando como hoy la fecha indicada arriba. Si no hay hora mencionada, usá las 23:00. Si no se puede determinar ninguna fecha, dejá "event_at_iso" en null. Formato ISO 8601 con horario de Córdoba (offset -03:00).
- Los montos ("total_amount", "deposit_amount") son en pesos argentinos, como números puros sin separadores de miles ni símbolo $ (ej. "20 mil" -> 20000).
- "promo_label_guess" y "tag_label_guesses" son etiquetas cortas en español (2-4 palabras) que resuman promociones o categorías mencionadas (ej: "2x1 tragos", "cumpleaños", "cliente VIP").
- Si un dato no aparece explícita o implícitamente en el contenido, devolvé null (o array vacío para "tag_label_guesses"). No inventes información que no esté presente.`;
}

async function runExtraction(
  content: ExtractionContentBlock[]
): Promise<{ error: string | null; draft: ParsedReservationDraft | null }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error, draft: null };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.', draft: null };
  }

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: DRAFT_SCHEMA },
      },
      system: buildInstructions(),
      messages: [{ role: 'user', content }],
    });

    if (response.stop_reason === 'refusal') {
      return { error: 'La IA no pudo procesar este contenido.', draft: null };
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { error: 'No se pudo interpretar la respuesta de la IA.', draft: null };
    }

    const parsed = JSON.parse(textBlock.text);
    const draft: ParsedReservationDraft = {
      venue: parsed.venue ?? null,
      eventAtIso: parsed.event_at_iso ?? null,
      customerName: parsed.customer_name ?? null,
      customerAge: parsed.customer_age ?? null,
      customerPhone: parsed.customer_phone ?? null,
      promoLabelGuess: parsed.promo_label_guess ?? null,
      promoDetail: parsed.promo_detail ?? null,
      isGift: parsed.is_gift ?? null,
      totalAmount: parsed.total_amount ?? null,
      depositAmount: parsed.deposit_amount ?? null,
      depositDetail: parsed.deposit_detail ?? null,
      tagLabelGuesses: Array.isArray(parsed.tag_label_guesses) ? parsed.tag_label_guesses : [],
    };
    return { error: null, draft };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al contactar la IA.', draft: null };
  }
}

export async function parseReservationFromText(text: string) {
  if (!text.trim()) return { error: 'Pegá el texto de la reserva.', draft: null };
  return runExtraction([{ type: 'text', text }]);
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export async function parseReservationFromImage(base64Data: string, mediaType: string) {
  if (!base64Data) return { error: 'Pegá o subí una imagen.', draft: null };
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mediaType)) {
    return { error: 'Formato de imagen no soportado. Usá PNG, JPG, WEBP o GIF.', draft: null };
  }
  return runExtraction([
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType as (typeof ALLOWED_IMAGE_TYPES)[number], data: base64Data },
    },
    { type: 'text', text: 'Extraé los datos de la reserva de esta imagen.' },
  ]);
}
