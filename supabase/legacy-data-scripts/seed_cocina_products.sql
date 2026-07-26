-- Precarga en Cocina (en 0) los productos del PDF de ejemplo que mandó el
-- usuario, para poder probar la planilla de conteo (Inicial/Ingresos/Final)
-- en ese sector. Son placeholders: reemplazar por los insumos reales de
-- cocina editando cada producto desde Productos con Cocina seleccionado
-- (o agregando nuevos desde ahí).

insert into product_stock (product_id, location_id, quantity, min_stock)
select p.id, l.id, 0, 0
from products p, locations l
where l.name = 'Cocina'
  and p.name in (
    'Agua mineral 500ml', 'Aperol', 'Campari', 'Cerveza Quilmes 1L',
    'Coca-Cola 500ml', 'Fernet Branca x 750 ml', 'Gin heredero', 'Papas fritas 150g'
  )
on conflict (product_id, location_id) do nothing;
