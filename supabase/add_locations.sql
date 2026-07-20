-- Multi-local: cada local tiene su propio stock. El stock deja de vivir en
-- products.quantity/min_stock (quedan deprecadas, no se borran todavía) y pasa a
-- vivir en product_stock, una fila por (producto, local).
--
-- Este script es seguro para correr más de una vez (usa IF NOT EXISTS / ON CONFLICT
-- en todos lados), por si una corrida anterior falló a mitad de camino.

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

alter table locations enable row level security;

drop policy if exists "locations: lectura autenticados" on locations;
create policy "locations: lectura autenticados" on locations
  for select using (auth.role() = 'authenticated');

drop policy if exists "locations: admin crea" on locations;
create policy "locations: admin crea" on locations
  for insert with check (app_current_role() = 'admin');

drop policy if exists "locations: admin actualiza" on locations;
create policy "locations: admin actualiza" on locations
  for update using (app_current_role() = 'admin');

drop policy if exists "locations: admin elimina" on locations;
create policy "locations: admin elimina" on locations
  for delete using (app_current_role() = 'admin');

-- Local por defecto, para no dejar huérfanos los datos que ya existen.
insert into locations (name)
select 'Principal'
where not exists (select 1 from locations where name = 'Principal');

create table if not exists product_stock (
  product_id uuid not null references products (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  quantity integer not null default 0,
  min_stock integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id)
);

alter table product_stock enable row level security;

drop policy if exists "product_stock: lectura autenticados" on product_stock;
create policy "product_stock: lectura autenticados" on product_stock
  for select using (auth.role() = 'authenticated');

-- No hace falta policy de insert/update para usuarios: product_stock solo se
-- modifica desde el trigger de stock_movements, que corre como security definer.

-- Backfill: el stock actual de cada producto pasa a ser el stock del local "Principal".
insert into product_stock (product_id, location_id, quantity, min_stock)
select p.id, l.id, p.quantity, p.min_stock
from products p, locations l
where l.name = 'Principal'
on conflict (product_id, location_id) do nothing;

-- stock_movements y audits pasan a pertenecer a un local.
alter table stock_movements add column if not exists location_id uuid references locations (id);
update stock_movements set location_id = (select id from locations where name = 'Principal')
  where location_id is null;
alter table stock_movements alter column location_id set not null;

alter table audits add column if not exists location_id uuid references locations (id);
update audits set location_id = (select id from locations where name = 'Principal')
  where location_id is null;
alter table audits alter column location_id set not null;

-- El trigger ahora ajusta product_stock por (product_id, location_id) en vez de
-- products.quantity.
create or replace function apply_stock_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into product_stock (product_id, location_id, quantity, min_stock)
  values (new.product_id, new.location_id, 0, 0)
  on conflict (product_id, location_id) do nothing;

  if new.type = 'entrada' then
    update product_stock set quantity = quantity + new.quantity, updated_at = now()
      where product_id = new.product_id and location_id = new.location_id;
  else
    update product_stock set quantity = quantity - new.quantity, updated_at = now()
      where product_id = new.product_id and location_id = new.location_id;
  end if;
  return new;
end;
$$;

-- La alerta de stock bajo ahora es por local: un mismo producto puede estar bajo
-- en un local y bien en otro. Se borra y se recrea porque CREATE OR REPLACE VIEW
-- no permite cambiar el orden/nombres de las columnas existentes.
drop view if exists low_stock_products;
create view low_stock_products as
  select
    p.id, p.barcode, p.name, p.category_id, p.active, p.cost_price, p.sale_price,
    ps.location_id, ps.quantity, ps.min_stock
  from products p
  join product_stock ps on ps.product_id = p.id
  where ps.quantity < ps.min_stock and p.active = true;
