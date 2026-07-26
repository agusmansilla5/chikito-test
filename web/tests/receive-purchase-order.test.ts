import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestAdminClient, createTestActor, deleteTestUser } from './helpers/supabase-test-client';

const admin = createTestAdminClient();

let actor: Awaited<ReturnType<typeof createTestActor>>;
let jefeActor: Awaited<ReturnType<typeof createTestActor>>;
let locationId: string;
let supplierId: string;
let productAId: string;
let productBId: string;

async function createOrder(status: 'pendiente' | 'pendiente_envio' | 'recibida' | 'cancelada' = 'pendiente') {
  const { data: order, error } = await admin
    .from('purchase_orders')
    .insert({ supplier_id: supplierId, location_id: locationId, status, created_by: actor.userId })
    .select('id')
    .single();
  if (error) throw error;

  const { data: items, error: itemsError } = await admin
    .from('purchase_order_items')
    .insert([
      { purchase_order_id: order!.id, product_id: productAId, quantity: 10, unit_cost: 100 },
      { purchase_order_id: order!.id, product_id: productBId, quantity: 5 },
    ])
    .select('id, product_id');
  if (itemsError) throw itemsError;

  return { orderId: order!.id as string, items: items! };
}

async function stockFor(productId: string) {
  const { data, error } = await admin
    .from('product_stock')
    .select('quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle();
  if (error) throw error;
  return data?.quantity ?? 0;
}

beforeEach(async () => {
  actor = await createTestActor(admin, 'admin');
  jefeActor = await createTestActor(admin, 'jefe');

  const { data: location, error: locError } = await admin
    .from('locations')
    .insert({ name: `Local OC ${actor.userId}` })
    .select('id')
    .single();
  if (locError) throw locError;
  locationId = location!.id;

  const { data: supplier, error: supError } = await admin
    .from('suppliers')
    .insert({ name: `Proveedor test ${actor.userId}` })
    .select('id')
    .single();
  if (supError) throw supError;
  supplierId = supplier!.id;

  const { data: products, error: prodError } = await admin
    .from('products')
    .insert([{ name: `Producto A ${actor.userId}` }, { name: `Producto B ${actor.userId}` }])
    .select('id');
  if (prodError) throw prodError;
  [productAId, productBId] = products!.map((p) => p.id);
});

afterEach(async () => {
  await admin.from('purchase_orders').delete().eq('supplier_id', supplierId);
  await admin.from('products').delete().in('id', [productAId, productBId]);
  await admin.from('suppliers').delete().eq('id', supplierId);
  await admin.from('locations').delete().eq('id', locationId);
  await deleteTestUser(admin, actor.userId);
  await deleteTestUser(admin, jefeActor.userId);
});

describe('receive_purchase_order', () => {
  it('recibir sin mermas crea un movimiento de entrada por línea y actualiza el costo', async () => {
    const { orderId } = await createOrder();

    const { error } = await actor.client.rpc('receive_purchase_order', { order_id: orderId });
    expect(error).toBeNull();

    expect(await stockFor(productAId)).toBe(10);
    expect(await stockFor(productBId)).toBe(5);

    const { data: order } = await admin.from('purchase_orders').select('status, received_at').eq('id', orderId).single();
    expect(order!.status).toBe('recibida');
    expect(order!.received_at).not.toBeNull();

    const { data: product } = await admin.from('products').select('cost_price').eq('id', productAId).single();
    expect(Number(product!.cost_price)).toBe(100);
  });

  it('acepta pendiente_envio igual que pendiente', async () => {
    const { orderId } = await createOrder('pendiente_envio');
    const { error } = await actor.client.rpc('receive_purchase_order', { order_id: orderId });
    expect(error).toBeNull();
    expect(await stockFor(productAId)).toBe(10);
  });

  it('con mermas: solo suma la cantidad realmente recibida y no crea movimiento si es 0', async () => {
    const { orderId, items } = await createOrder();
    const itemA = items.find((i) => i.product_id === productAId)!;
    const itemB = items.find((i) => i.product_id === productBId)!;

    const { error } = await actor.client.rpc('receive_purchase_order', {
      order_id: orderId,
      received_items: [
        { item_id: itemA.id, received_quantity: 7 },
        { item_id: itemB.id, received_quantity: 0 },
      ],
    });
    expect(error).toBeNull();

    expect(await stockFor(productAId)).toBe(7);
    expect(await stockFor(productBId)).toBe(0);

    const { data: movements } = await admin.from('stock_movements').select('product_id').eq('product_id', productBId);
    expect(movements).toHaveLength(0);
  });

  it('rechaza recibir una orden ya recibida y no modifica nada', async () => {
    const { orderId } = await createOrder('recibida');

    const { error } = await actor.client.rpc('receive_purchase_order', { order_id: orderId });
    expect(error).not.toBeNull();

    expect(await stockFor(productAId)).toBe(0);
    expect(await stockFor(productBId)).toBe(0);
  });

  it('rechaza recibir una orden cancelada', async () => {
    const { orderId } = await createOrder('cancelada');
    const { error } = await actor.client.rpc('receive_purchase_order', { order_id: orderId });
    expect(error).not.toBeNull();
  });

  it('rechaza a un usuario sin rol admin/auditor', async () => {
    const { orderId } = await createOrder();
    const { error } = await jefeActor.client.rpc('receive_purchase_order', { order_id: orderId });
    expect(error).not.toBeNull();
    expect(await stockFor(productAId)).toBe(0);
  });
});
