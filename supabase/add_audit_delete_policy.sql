-- Permite borrar auditorías del historial, solo admin. No existía ninguna
-- policy de DELETE en audits, así que hoy está bloqueado por RLS (deny por
-- default). Es seguro: stock_movements.audit_id referencia a audits con
-- "on delete set null" (ver add_audits.sql), así que borrar una auditoría
-- nunca borra el historial de movimientos - solo desvincula esos movimientos
-- de la auditoría eliminada.

drop policy if exists "audits: admin elimina" on audits;
create policy "audits: admin elimina" on audits
  for delete using (app_current_role() = 'admin');
