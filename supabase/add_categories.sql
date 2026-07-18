-- Categorías de productos (rubros: "sin alcohol", "con alcohol", "premium", etc.)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table products add column category_id uuid references categories (id) on delete set null;

alter table categories enable row level security;

create policy "categories: lectura autenticados" on categories
  for select using (auth.role() = 'authenticated');

create policy "categories: admin y auditor crean" on categories
  for insert with check (app_current_role() in ('admin', 'auditor'));

create policy "categories: admin elimina" on categories
  for delete using (app_current_role() = 'admin');
