-- Nombre y apellido de la persona que efectivamente hizo el conteo (la cuenta
-- que inicia sesión suele ser compartida entre varios empleados, así que esto
-- identifica a la persona real, además de "started_by"/profiles que identifica
-- la cuenta). Nullable a nivel de base para no romper auditorías viejas; se
-- exige completarlo en el formulario para las auditorías nuevas.
alter table audits add column if not exists responsible_name text;
