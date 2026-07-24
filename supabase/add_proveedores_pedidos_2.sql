-- Proveedores y Pedidos (paso 2 de 2): correr DESPUÉS de
-- add_proveedores_pedidos_1_enum.sql (ese agrega el valor de enum
-- 'pendiente_envio' que acá se usa).
--
-- Extiende el módulo existente de proveedores/órdenes de compra (Fase 1D)
-- con: datos bancarios y modalidad de entrega del proveedor, productos
-- habituales por proveedor (para precargar pedidos), fecha/monto/detalle de
-- envío del pedido, cantidad recibida por línea (mermas/faltantes) y pagos
-- (soporta pagos parciales - no hay columna de "estado de pago", se calcula
-- en la app sumando purchase_order_payments contra purchase_orders.amount).

-- ── Proveedores: modalidad de entrega + datos bancarios ─────────────────────

alter table suppliers add column if not exists fulfillment_mode text
  check (fulfillment_mode in ('envio', 'retiro'));
alter table suppliers add column if not exists cbu_cvu text;
alter table suppliers add column if not exists alias text;
alter table suppliers add column if not exists bank_name text;
alter table suppliers add column if not exists account_holder text;

-- ── Productos habituales por proveedor (botón "Cargar pedido habitual") ────

create table if not exists supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  default_quantity integer check (default_quantity is null or default_quantity > 0),
  default_unit_cost numeric(12,2),
  created_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

alter table supplier_products enable row level security;

drop policy if exists "supplier_products: lectura autenticados" on supplier_products;
create policy "supplier_products: lectura autenticados" on supplier_products
  for select using (auth.role() = 'authenticated');

drop policy if exists "supplier_products: admin y auditor escriben" on supplier_products;
create policy "supplier_products: admin y auditor escriben" on supplier_products
  for insert with check (app_current_role() in ('admin', 'auditor'));

drop policy if exists "supplier_products: admin y auditor actualizan" on supplier_products;
create policy "supplier_products: admin y auditor actualizan" on supplier_products
  for update using (app_current_role() in ('admin', 'auditor'));

drop policy if exists "supplier_products: admin y auditor eliminan" on supplier_products;
create policy "supplier_products: admin y auditor eliminan" on supplier_products
  for delete using (app_current_role() in ('admin', 'auditor'));

-- ── Pedido: fecha propia (puede diferir de created_at), monto, envío ───────

alter table purchase_orders add column if not exists order_date date not null default current_date;
alter table purchase_orders add column if not exists amount numeric(12,2);
alter table purchase_orders add column if not exists shipping_detail text;

-- ── Mermas/faltantes: cantidad realmente recibida por línea ────────────────

alter table purchase_order_items add column if not exists received_quantity integer
  check (received_quantity is null or received_quantity >= 0);

-- ── Pagos (soporta pagos parciales; el estado se deriva en la app) ─────────

create table if not exists purchase_order_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  method text,
  receipt_path text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

alter table purchase_order_payments enable row level security;

drop policy if exists "purchase_order_payments: lectura autenticados" on purchase_order_payments;
create policy "purchase_order_payments: lectura autenticados" on purchase_order_payments
  for select using (auth.role() = 'authenticated');

drop policy if exists "purchase_order_payments: admin y auditor crean" on purchase_order_payments;
create policy "purchase_order_payments: admin y auditor crean" on purchase_order_payments
  for insert with check (app_current_role() in ('admin', 'auditor') and created_by = auth.uid());

drop policy if exists "purchase_order_payments: admin elimina" on purchase_order_payments;
create policy "purchase_order_payments: admin elimina" on purchase_order_payments
  for delete using (app_current_role() = 'admin');

-- ── Storage: comprobantes de pago (bucket privado, se accede con signed URL) ─

insert into storage.buckets (id, name, public)
values ('comprobantes-pedidos', 'comprobantes-pedidos', false)
on conflict (id) do nothing;

drop policy if exists "comprobantes-pedidos: lectura autenticados" on storage.objects;
create policy "comprobantes-pedidos: lectura autenticados" on storage.objects
  for select using (bucket_id = 'comprobantes-pedidos' and auth.role() = 'authenticated');

drop policy if exists "comprobantes-pedidos: admin y auditor suben" on storage.objects;
create policy "comprobantes-pedidos: admin y auditor suben" on storage.objects
  for insert with check (bucket_id = 'comprobantes-pedidos' and app_current_role() in ('admin', 'auditor'));

drop policy if exists "comprobantes-pedidos: admin elimina" on storage.objects;
create policy "comprobantes-pedidos: admin elimina" on storage.objects
  for delete using (bucket_id = 'comprobantes-pedidos' and app_current_role() = 'admin');

-- ── Recibir orden: ahora acepta cantidades recibidas distintas a las
--    pedidas (mermas/faltantes). Si no se manda received_items, se recibe
--    la cantidad pedida tal cual - mismo comportamiento que antes, así que
--    esto no rompe nada de lo que ya está en producción. También acepta
--    'pendiente_envio' además del 'pendiente' original como estados
--    recibibles.

create or replace function receive_purchase_order(order_id uuid, received_items jsonb default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  po purchase_orders%rowtype;
  item purchase_order_items%rowtype;
  uid uuid := auth.uid();
  qty integer;
begin
  if app_current_role() not in ('admin', 'auditor') then
    raise exception 'No autorizado.';
  end if;

  select * into po from purchase_orders where id = order_id for update;
  if not found then
    raise exception 'Orden de compra no encontrada.';
  end if;
  if po.status not in ('pendiente', 'pendiente_envio') then
    raise exception 'Esta orden ya fue recibida o cancelada.';
  end if;

  for item in select * from purchase_order_items where purchase_order_id = order_id loop
    qty := coalesce(
      (select (elem->>'received_quantity')::integer
       from jsonb_array_elements(received_items) elem
       where (elem->>'item_id')::uuid = item.id),
      item.quantity
    );

    if qty > 0 then
      insert into stock_movements (product_id, type, quantity, note, created_by, location_id)
      values (item.product_id, 'entrada', qty, 'Recepción de pedido', uid, po.location_id);
    end if;

    update purchase_order_items set received_quantity = qty where id = item.id;

    if item.unit_cost is not null and qty > 0 then
      update products set cost_price = item.unit_cost, updated_at = now() where id = item.product_id;
    end if;
  end loop;

  update purchase_orders set status = 'recibida', received_at = now() where id = order_id;
end;
$$;
