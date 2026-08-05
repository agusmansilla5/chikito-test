import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/dal';
import type { Product, PurchaseOrder, PurchaseOrderItem, Supplier } from '@/lib/types';
import { EditPurchaseOrderClient } from './edit-purchase-order-client';

type ProductWithStock = Product & { product_stock: { quantity: number; min_stock: number; location_id: string }[] };

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect(`/purchase-orders/${id}`);

  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: suppliers }, { data: productsRaw }] = await Promise.all([
    supabase.from('purchase_orders').select('*, locations(name)').eq('id', id).single(),
    supabase.from('purchase_order_items').select('*, products(name)').eq('purchase_order_id', id),
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('products').select('*, categories(name), product_stock(quantity, min_stock, location_id)').order('name'),
  ]);

  if (!order) {
    return (
      <div>
        <p className="text-foreground">No se encontró el pedido.</p>
      </div>
    );
  }

  const orderData = order as PurchaseOrder & { locations?: { name: string } | null };
  const locationId = orderData.location_id;
  const locationName = orderData.locations?.name ?? '';

  const products: Product[] = ((productsRaw as ProductWithStock[]) ?? []).map((p) => {
    const stock = p.product_stock.find((ps) => ps.location_id === locationId);
    return { ...p, quantity: stock?.quantity ?? 0, min_stock: stock?.min_stock ?? 0 };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Editar pedido</h1>
      <EditPurchaseOrderClient
        order={orderData}
        items={(items as PurchaseOrderItem[]) ?? []}
        suppliers={(suppliers as Supplier[]) ?? []}
        products={products}
        locationName={locationName}
      />
    </div>
  );
}
