-- Riesgo señalado en la auditoría del código (punto 2, "integridad de datos"):
-- la política de UPDATE en audits dejaba que cualquier admin/auditor cerrara o
-- editara la nota de una auditoría iniciada por otra persona. Ahora un auditor
-- solo puede cerrar/editar las que inició él mismo; admin sigue pudiendo
-- gestionar cualquiera (para poder destrabar una auditoría abandonada).

drop policy if exists "audits: admin y auditor cierran" on audits;

drop policy if exists "audits: admin gestiona cualquiera" on audits;
create policy "audits: admin gestiona cualquiera" on audits
  for update using (app_current_role() = 'admin');

drop policy if exists "audits: auditor gestiona las propias" on audits;
create policy "audits: auditor gestiona las propias" on audits
  for update using (app_current_role() = 'auditor' and started_by = auth.uid());
