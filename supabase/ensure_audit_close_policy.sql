-- Asegura que la política para cerrar auditorías exista (seguro correrlo aunque ya exista)
drop policy if exists "audits: admin y auditor cierran" on audits;
create policy "audits: admin y auditor cierran" on audits
  for update using (app_current_role() in ('admin', 'auditor'));
