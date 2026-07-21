-- Bug: crear un local nuevo (createLocation) o un producto nuevo (createProduct)
-- intenta sembrar filas de product_stock en 0 para cada combinación
-- producto+local, insertando directo desde la app (no a través del trigger
-- de stock_movements, que es el único camino que tenía permiso porque corre
-- como security definer). product_stock nunca tuvo policy de insert para
-- usuarios normales, así que esos inserts venían fallando en silencio por RLS
-- desde que existe la función de crear locales/productos (Fase 1C en
-- adelante) - recién se nota ahora que se crearon varios locales nuevos
-- (Barra 2, Barra 3, Barra VIP, Cocina) y aparecen sin ningún producto.

drop policy if exists "product_stock: admin y auditor crean" on product_stock;
create policy "product_stock: admin y auditor crean" on product_stock
  for insert with check (app_current_role() in ('admin', 'auditor'));

-- Backfill retroactivo: crea en 0 cualquier combinación (producto, local)
-- que debería existir y no existe todavía, para todos los locales/productos
-- ya creados que quedaron pisados por el bug.
insert into product_stock (product_id, location_id, quantity, min_stock)
select p.id, l.id, 0, 0
from products p
cross join locations l
where not exists (
  select 1 from product_stock ps where ps.product_id = p.id and ps.location_id = l.id
)
on conflict (product_id, location_id) do nothing;
