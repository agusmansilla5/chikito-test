-- Asigna roles y nombres a los usuarios de prueba
update profiles set role = 'admin', full_name = 'Chikito (Admin)'
where id = (select id from auth.users where email = 'chikito@nido.com');

update profiles set full_name = 'Control Stock (Auditor)'
where id = (select id from auth.users where email = 'controlstock@nido.com');

update profiles set role = 'jefe', full_name = 'Morio (Jefe)'
where id = (select id from auth.users where email = 'morio@nido.com');

-- Verificación
select full_name, role from profiles order by role;
