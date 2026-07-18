-- Esquema base para la app de control de stock
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query)

-- 1. Roles de usuario
create type user_role as enum ('admin', 'auditor', 'jefe');

-- 2. Perfiles (extiende auth.users con rol y nombre)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'auditor',
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'auditor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 3. Productos
create table products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  quantity integer not null default 0,
  min_stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Movimientos de stock (entradas / salidas)
create type movement_type as enum ('entrada', 'salida');

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  type movement_type not null,
  quantity integer not null check (quantity > 0),
  note text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

-- Mantiene products.quantity actualizado cuando se inserta un movimiento
create function apply_stock_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type = 'entrada' then
    update products set quantity = quantity + new.quantity, updated_at = now() where id = new.product_id;
  else
    update products set quantity = quantity - new.quantity, updated_at = now() where id = new.product_id;
  end if;
  return new;
end;
$$;

create trigger on_stock_movement_created
  after insert on stock_movements
  for each row execute procedure apply_stock_movement();

-- Helper: rol del usuario autenticado actual
-- (no se llama "current_role": es palabra reservada de PostgreSQL)
create function app_current_role()
returns user_role
language sql stable
security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- 5. Row Level Security
alter table profiles enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;

-- profiles: cada usuario ve su propio perfil; admin ve todos
create policy "profiles: ver propio perfil" on profiles
  for select using (id = auth.uid() or app_current_role() = 'admin');

create policy "profiles: admin actualiza roles" on profiles
  for update using (app_current_role() = 'admin');

-- products: todo usuario autenticado puede leer
create policy "products: lectura autenticados" on products
  for select using (auth.role() = 'authenticated');

-- products: admin y auditor pueden crear/editar productos
create policy "products: admin y auditor escriben" on products
  for insert with check (app_current_role() in ('admin', 'auditor'));

create policy "products: admin y auditor actualizan" on products
  for update using (app_current_role() in ('admin', 'auditor'));

create policy "products: admin elimina" on products
  for delete using (app_current_role() = 'admin');

-- stock_movements: todo usuario autenticado puede leer (reportes)
create policy "movements: lectura autenticados" on stock_movements
  for select using (auth.role() = 'authenticated');

-- stock_movements: solo admin y auditor pueden registrar
create policy "movements: admin y auditor registran" on stock_movements
  for insert with check (app_current_role() in ('admin', 'auditor') and created_by = auth.uid());

-- 6. Vista de alerta de stock bajo (para reportes)
create view low_stock_products as
  select * from products where quantity <= min_stock;

-- 7. Habilita Realtime para que el dashboard web se actualice solo
alter publication supabase_realtime add table stock_movements;
