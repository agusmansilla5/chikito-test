-- "Áreas" de stock (Cocina, Barra 1, Barra 2, Limpieza, Depósito, etc.):
-- una etiqueta por producto independiente del rubro, para poder filtrar el
-- catálogo por sector físico del negocio. Mismo patrón que categories.

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table products add column area_id uuid references areas (id) on delete set null;

alter table areas enable row level security;

drop policy if exists "areas: lectura autenticados" on areas;
create policy "areas: lectura autenticados" on areas
  for select using (auth.role() = 'authenticated');

drop policy if exists "areas: admin y auditor crean" on areas;
create policy "areas: admin y auditor crean" on areas
  for insert with check (app_current_role() in ('admin', 'auditor'));

drop policy if exists "areas: admin y auditor renombran" on areas;
create policy "areas: admin y auditor renombran" on areas
  for update using (app_current_role() in ('admin', 'auditor'));

drop policy if exists "areas: admin elimina" on areas;
create policy "areas: admin elimina" on areas
  for delete using (app_current_role() = 'admin');
