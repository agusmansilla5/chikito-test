-- Auditorías de stock (sesiones de conteo, identificadas por fecha)
create table audits (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  started_by uuid not null references profiles (id),
  note text,
  created_at timestamptz not null default now()
);

alter table stock_movements add column audit_id uuid references audits (id) on delete set null;

alter table audits enable row level security;

create policy "audits: lectura autenticados" on audits
  for select using (auth.role() = 'authenticated');

create policy "audits: admin y auditor inician" on audits
  for insert with check (app_current_role() in ('admin', 'auditor') and started_by = auth.uid());
