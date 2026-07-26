import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestAdminClient, createTestActor, deleteTestUser } from './helpers/supabase-test-client';

const admin = createTestAdminClient();

let actor: Awaited<ReturnType<typeof createTestActor>>;
let locationAId: string;
let locationBId: string;
let productId: string;

beforeEach(async () => {
  actor = await createTestActor(admin, 'admin');

  const { data: locations, error: locError } = await admin
    .from('locations')
    .insert([{ name: `Local A ${actor.userId}` }, { name: `Local B ${actor.userId}` }])
    .select('id');
  if (locError) throw locError;
  [locationAId, locationBId] = locations!.map((l) => l.id);

  const { data: product, error: prodError } = await admin
    .from('products')
    .insert({ name: `Producto test ${actor.userId}` })
    .select('id')
    .single();
  if (prodError) throw prodError;
  productId = product!.id;
});

afterEach(async () => {
  await admin.from('products').delete().eq('id', productId);
  await admin.from('locations').delete().in('id', [locationAId, locationBId]);
  await deleteTestUser(admin, actor.userId);
});

async function stockFor(locationId: string) {
  const { data, error } = await admin
    .from('product_stock')
    .select('quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle();
  if (error) throw error;
  return data?.quantity ?? 0;
}

describe('apply_stock_movement trigger', () => {
  it('una entrada suma la cantidad al stock del local', async () => {
    const { error } = await actor.client.from('stock_movements').insert({
      product_id: productId,
      location_id: locationAId,
      type: 'entrada',
      quantity: 10,
      created_by: actor.userId,
    });
    expect(error).toBeNull();
    expect(await stockFor(locationAId)).toBe(10);
  });

  it('una salida resta la cantidad del stock del local', async () => {
    await actor.client.from('stock_movements').insert({
      product_id: productId,
      location_id: locationAId,
      type: 'entrada',
      quantity: 10,
      created_by: actor.userId,
    });
    const { error } = await actor.client.from('stock_movements').insert({
      product_id: productId,
      location_id: locationAId,
      type: 'salida',
      quantity: 4,
      created_by: actor.userId,
    });
    expect(error).toBeNull();
    expect(await stockFor(locationAId)).toBe(6);
  });

  it('varios movimientos se acumulan correctamente', async () => {
    for (const [type, quantity] of [
      ['entrada', 5],
      ['entrada', 3],
      ['salida', 2],
      ['entrada', 1],
    ] as const) {
      await actor.client.from('stock_movements').insert({
        product_id: productId,
        location_id: locationAId,
        type,
        quantity,
        created_by: actor.userId,
      });
    }
    expect(await stockFor(locationAId)).toBe(7);
  });

  it('el stock es independiente por local: mover en A no afecta a B', async () => {
    await actor.client.from('stock_movements').insert({
      product_id: productId,
      location_id: locationAId,
      type: 'entrada',
      quantity: 20,
      created_by: actor.userId,
    });
    expect(await stockFor(locationAId)).toBe(20);
    expect(await stockFor(locationBId)).toBe(0);
  });
});
