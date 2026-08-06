'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ReservationChipKind, ReservationVenue } from '@/lib/types';

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

export type ReservationInput = {
  venue: ReservationVenue;
  eventAt: string;
  customerName: string;
  customerAge: number | null;
  customerPhone: string | null;
  guestCount: number | null;
  serviceDetail: string | null;
  promoChipId: string | null;
  promoDetail: string | null;
  isGift: boolean;
  giftDetail: string | null;
  totalAmount: number;
  depositAmount: number;
  depositDetail: string | null;
  tagChipIds: string[];
};

export async function createReservation(input: ReservationInput) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error, id: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.', id: null };

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      venue: input.venue,
      event_at: input.eventAt,
      customer_name: input.customerName,
      customer_age: input.customerAge,
      customer_phone: input.customerPhone,
      guest_count: input.guestCount,
      service_detail: input.serviceDetail,
      promo_chip_id: input.promoChipId,
      promo_detail: input.promoDetail,
      is_gift: input.isGift,
      gift_detail: input.giftDetail,
      total_amount: input.totalAmount,
      deposit_amount: input.depositAmount,
      deposit_detail: input.depositDetail,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) return { error: error.message, id: null };

  if (input.tagChipIds.length > 0) {
    const { error: tagsError } = await supabase
      .from('reservation_tag_links')
      .insert(input.tagChipIds.map((chip_id) => ({ reservation_id: reservation.id, chip_id })));
    if (tagsError) return { error: tagsError.message, id: reservation.id as string };
  }

  revalidatePath('/reservas');
  return { error: null, id: reservation.id as string };
}

export async function updateReservation(id: string, input: ReservationInput) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from('reservations')
    .update({
      venue: input.venue,
      event_at: input.eventAt,
      customer_name: input.customerName,
      customer_age: input.customerAge,
      customer_phone: input.customerPhone,
      guest_count: input.guestCount,
      service_detail: input.serviceDetail,
      promo_chip_id: input.promoChipId,
      promo_detail: input.promoDetail,
      is_gift: input.isGift,
      gift_detail: input.giftDetail,
      total_amount: input.totalAmount,
      deposit_amount: input.depositAmount,
      deposit_detail: input.depositDetail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  const { error: deleteError } = await supabase.from('reservation_tag_links').delete().eq('reservation_id', id);
  if (deleteError) return { error: deleteError.message };

  if (input.tagChipIds.length > 0) {
    const { error: tagsError } = await supabase
      .from('reservation_tag_links')
      .insert(input.tagChipIds.map((chip_id) => ({ reservation_id: id, chip_id })));
    if (tagsError) return { error: tagsError.message };
  }

  revalidatePath('/reservas');
  return { error: null };
}

export async function deleteReservation(id: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/reservas');
  return { error: null };
}

export async function createChipOption(kind: ReservationChipKind, label: string, color: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error, chip: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservation_chip_options')
    .insert({ kind, label, color })
    .select()
    .single();
  if (error) return { error: error.message, chip: null };

  revalidatePath('/reservas');
  return { error: null, chip: data };
}

export async function updateChipOption(id: string, label: string, color: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('reservation_chip_options').update({ label, color }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/reservas');
  return { error: null };
}

export async function deleteChipOption(id: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('reservation_chip_options').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/reservas');
  return { error: null };
}
