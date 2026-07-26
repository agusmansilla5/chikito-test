-- Prepara la carga real de stock de Cocina (PDF "09-07-26 STOCK - 1 STOCK
-- INICIAL"): crea los rubros que aparecen en esa planilla (no existían, los
-- rubros actuales son todos de barra) y saca de Cocina los 8 productos de
-- prueba que se habían precargado como placeholder (esos son de bebida, no
-- de cocina).

insert into categories (name)
values
  ('Producción'),
  ('Aderezos'),
  ('Verdulería'),
  ('Masas y Panes'),
  ('Congelados'),
  ('Quesos, Lácteos y Fiambres'),
  ('Almacén'),
  ('Condimentos y Especias'),
  ('Limpieza'),
  ('Descartables')
on conflict (name) do nothing;

delete from product_stock
where location_id in (select id from locations where name = 'Cocina')
  and product_id in (
    select id from products where name in (
      'Agua mineral 500ml', 'Aperol', 'Campari', 'Cerveza Quilmes 1L',
      'Coca-Cola 500ml', 'Fernet Branca x 750 ml', 'Gin heredero', 'Papas fritas 150g'
    )
  );
