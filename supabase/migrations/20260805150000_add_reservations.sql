-- Módulo "Gestión de Reservas": exclusivo para el rol admin (RLS más abajo),
-- para reservas de eventos/mesas en las distintas sedes del negocio.
-- No tiene relación con el dominio de stock (products/locations/audits) de
-- esta app: "sede" acá es un negocio/local distinto, no un sector interno.

do $$ begin
  create type reservation_venue as enum ('nido', 'canario', 'room347', 'el_pasillo');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reservation_chip_kind as enum ('promo', 'tag');
exception when duplicate_object then null;
end $$;

-- Opciones de "chips" editables por el admin: promociones (selección única
-- por reserva, vía reservations.promo_chip_id) y etiquetas personalizadas
-- (selección múltiple, vía reservation_tag_links). Misma tabla para ambos
-- tipos, discriminada por "kind", para reusar un único componente de
-- administración (crear/editar label+color/borrar) en la UI.
create table if not exists reservation_chip_options (
  id uuid primary key default gen_random_uuid(),
  kind reservation_chip_kind not null,
  label text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  venue reservation_venue not null,
  event_at timestamptz not null,
  customer_name text not null,
  customer_age integer,
  customer_phone text,
  promo_chip_id uuid references reservation_chip_options (id) on delete set null,
  promo_detail text,
  is_gift boolean not null default false,
  total_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  deposit_detail text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reservation_tag_links (
  reservation_id uuid not null references reservations (id) on delete cascade,
  chip_id uuid not null references reservation_chip_options (id) on delete cascade,
  primary key (reservation_id, chip_id)
);

create index if not exists reservations_event_at_idx on reservations (event_at);
create index if not exists reservations_venue_idx on reservations (venue);

alter table reservation_chip_options enable row level security;
alter table reservations enable row level security;
alter table reservation_tag_links enable row level security;

-- Estrictamente admin-only a nivel de base: auditor y jefe no tienen acceso
-- a este módulo ni por API directa, no solo oculto en el menú.

drop policy if exists "reservation_chip_options: solo admin lee" on reservation_chip_options;
create policy "reservation_chip_options: solo admin lee" on reservation_chip_options
  for select using (app_current_role() = 'admin');

drop policy if exists "reservation_chip_options: solo admin crea" on reservation_chip_options;
create policy "reservation_chip_options: solo admin crea" on reservation_chip_options
  for insert with check (app_current_role() = 'admin');

drop policy if exists "reservation_chip_options: solo admin actualiza" on reservation_chip_options;
create policy "reservation_chip_options: solo admin actualiza" on reservation_chip_options
  for update using (app_current_role() = 'admin');

drop policy if exists "reservation_chip_options: solo admin elimina" on reservation_chip_options;
create policy "reservation_chip_options: solo admin elimina" on reservation_chip_options
  for delete using (app_current_role() = 'admin');

drop policy if exists "reservations: solo admin lee" on reservations;
create policy "reservations: solo admin lee" on reservations
  for select using (app_current_role() = 'admin');

drop policy if exists "reservations: solo admin crea" on reservations;
create policy "reservations: solo admin crea" on reservations
  for insert with check (app_current_role() = 'admin' and created_by = auth.uid());

drop policy if exists "reservations: solo admin actualiza" on reservations;
create policy "reservations: solo admin actualiza" on reservations
  for update using (app_current_role() = 'admin');

drop policy if exists "reservations: solo admin elimina" on reservations;
create policy "reservations: solo admin elimina" on reservations
  for delete using (app_current_role() = 'admin');

drop policy if exists "reservation_tag_links: solo admin lee" on reservation_tag_links;
create policy "reservation_tag_links: solo admin lee" on reservation_tag_links
  for select using (app_current_role() = 'admin');

drop policy if exists "reservation_tag_links: solo admin crea" on reservation_tag_links;
create policy "reservation_tag_links: solo admin crea" on reservation_tag_links
  for insert with check (app_current_role() = 'admin');

drop policy if exists "reservation_tag_links: solo admin elimina" on reservation_tag_links;
create policy "reservation_tag_links: solo admin elimina" on reservation_tag_links
  for delete using (app_current_role() = 'admin');

-- Datos de prueba (pedidos explícitamente por el spec), solo si ya existe un
-- admin en este proyecto -- no-op en un proyecto recién creado sin usuarios.
do $$
declare
  admin_id uuid;
  promo1 uuid;
  promo2 uuid;
  tag_cumple uuid;
  tag_vip uuid;
  tag_transferencia uuid;
begin
  select id into admin_id from profiles where role = 'admin' limit 1;
  if admin_id is null then
    return;
  end if;

  insert into reservation_chip_options (kind, label, color) values ('promo', '2x1 tragos', '#f59e0b')
    returning id into promo1;
  insert into reservation_chip_options (kind, label, color) values ('promo', 'Mesa VIP + botella', '#8b5cf6')
    returning id into promo2;
  insert into reservation_chip_options (kind, label, color) values ('tag', 'Cumpleaños', '#ec4899')
    returning id into tag_cumple;
  insert into reservation_chip_options (kind, label, color) values ('tag', 'Cliente VIP', '#10b981')
    returning id into tag_vip;
  insert into reservation_chip_options (kind, label, color) values ('tag', 'Paga transferencia', '#3b82f6')
    returning id into tag_transferencia;

  insert into reservations
    (venue, event_at, customer_name, customer_age, customer_phone, promo_chip_id, promo_detail, is_gift, total_amount, deposit_amount, deposit_detail, created_by)
  values
    ('nido', now() + interval '2 days', 'Juan Pérez', 28, '+5493511234567', promo1, '2x1 en tragos de autor toda la noche', false, 45000, 15000, 'Abona el saldo antes por transferencia', admin_id),
    ('canario', now() + interval '5 days', 'María Gómez', 25, '+5493517654321', promo2, 'Botella de fernet + mesa reservada 6 personas', true, 60000, 20000, 'Paga el saldo en el local', admin_id),
    ('room347', now() + interval '1 days', 'Lucas Fernández', 31, '+5493519998877', null, null, false, 30000, 0, null, admin_id),
    ('el_pasillo', now() - interval '3 days', 'Sofía Ramírez', 24, '+5493516665544', promo1, '2x1 en tragos de autor', false, 45000, 45000, 'Pagó todo por adelantado', admin_id),
    ('nido', now() + interval '10 days', 'Diego Torres', 35, '+5493513332211', null, 'Cumpleaños sorpresa, torta incluida', true, 80000, 30000, 'Abona el saldo antes por transferencia', admin_id);

  insert into reservation_tag_links (reservation_id, chip_id)
    select r.id, tag_cumple from reservations r where r.customer_name = 'Diego Torres';
  insert into reservation_tag_links (reservation_id, chip_id)
    select r.id, tag_vip from reservations r where r.customer_name = 'María Gómez';
  insert into reservation_tag_links (reservation_id, chip_id)
    select r.id, tag_transferencia from reservations r where r.customer_name = 'Juan Pérez';
end $$;
