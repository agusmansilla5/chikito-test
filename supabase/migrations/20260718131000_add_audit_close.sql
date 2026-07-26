-- Migración formalizada a partir de supabase/add_audit_close.sql (aplicado originalmente el 2026-07-18).
-- Fecha de cierre de auditoría
alter table audits add column ended_at timestamptz;

-- Faltaba la política para poder cerrarlas (actualizar ended_at)
create policy "audits: admin y auditor cierran" on audits
  for update using (app_current_role() in ('admin', 'auditor'));
