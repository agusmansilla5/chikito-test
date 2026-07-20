-- Fase 1D: proveedores y órdenes de compra.
-- Recibir una orden reutiliza stock_movements (y por lo tanto el trigger
-- apply_stock_movement que ya mantiene product_stock al día), para que el
-- stock que entra por una OC se vea exactamente igual que cualquier otro
-- movimiento en reportes, auditorías, etc.

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

alter table suppliers enable row level security;

drop policy if exists "suppliers: lectura autenticados" on suppliers;
create policy "suppliers: lectura autenticados" on suppliers
  for select using (auth.role() = 'authenticated');

drop policy if exists "suppliers: admin y auditor escriben" on suppliers;
create policy "suppliers: admin y auditor escriben" on suppliers
  for insert with check (app_current_role() in ('admin', 'auditor'));

drop policy if exists "suppliers: admin y auditor actualizan" on suppliers;
create policy "suppliers: admin y auditor actualizan" on suppliers
  for update using (app_current_role() in ('admin', 'auditor'));

drop policy if exists "suppliers: admin elimina" on suppliers;
create policy "suppliers: admin elimina" on suppliers
  for delete using (app_current_role() = 'admin');


do $$ begin
  create type purchase_order_status as enum ('pendiente', 'recibida', 'cancelada');
exception when duplicate_object then null;
end $$;

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete restrict,
  location_id uuid not null references locations (id) on delete restrict,
  status purchase_order_status not null default 'pendiente',
  note text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2)
);

alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;

drop policy if exists "purchase_orders: lectura autenticados" on purchase_orders;
create policy "purchase_orders: lectura autenticados" on purchase_orders
  for select using (auth.role() = 'authenticated');

drop policy if exists "purchase_orders: admin y auditor crean" on purchase_orders;
create policy "purchase_orders: admin y auditor crean" on purchase_orders
  for insert with check (app_current_role() in ('admin', 'auditor') and created_by = auth.uid());

drop policy if exists "purchase_orders: admin y auditor actualizan" on purchase_orders;
create policy "purchase_orders: admin y auditor actualizan" on purchase_orders
  for update using (app_current_role() in ('admin', 'auditor'));

drop policy if exists "purchase_orders: admin elimina" on purchase_orders;
create policy "purchase_orders: admin elimina" on purchase_orders
  for delete using (app_current_role() = 'admin');

drop policy if exists "purchase_order_items: lectura autenticados" on purchase_order_items;
create policy "purchase_order_items: lectura autenticados" on purchase_order_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "purchase_order_items: admin y auditor escriben" on purchase_order_items;
create policy "purchase_order_items: admin y auditor escriben" on purchase_order_items
  for insert with check (app_current_role() in ('admin', 'auditor'));

drop policy if exists "purchase_order_items: admin y auditor eliminan" on purchase_order_items;
create policy "purchase_order_items: admin y auditor eliminan" on purchase_order_items
  for delete using (app_current_role() in ('admin', 'auditor'));

-- Recibir la orden: crea un movimiento de entrada por cada línea (que a su vez
-- actualiza product_stock vía el trigger existente), actualiza el costo del
-- producto si se cargó, y marca la orden como recibida. Todo en una sola
-- transacción para no dejar la orden a medio recibir si algo falla.
create or replace function receive_purchase_order(order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  po purchase_orders%rowtype;
  item purchase_order_items%rowtype;
  uid uuid := auth.uid();
begin
  if app_current_role() not in ('admin', 'auditor') then
    raise exception 'No autorizado.';
  end if;

  select * into po from purchase_orders where id = order_id for update;
  if not found then
    raise exception 'Orden de compra no encontrada.';
  end if;
  if po.status <> 'pendiente' then
    raise exception 'Esta orden ya fue recibida o cancelada.';
  end if;

  for item in select * from purchase_order_items where purchase_order_id = order_id loop
    insert into stock_movements (product_id, type, quantity, note, created_by, location_id)
    values (item.product_id, 'entrada', item.quantity, 'Recepción de orden de compra', uid, po.location_id);

    if item.unit_cost is not null then
      update products set cost_price = item.unit_cost, updated_at = now() where id = item.product_id;
    end if;
  end loop;

  update purchase_orders set status = 'recibida', received_at = now() where id = order_id;
end;
$$;
